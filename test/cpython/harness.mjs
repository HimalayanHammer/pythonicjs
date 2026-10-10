// Runs the same cases through pythonicjs and real CPython and compares the
// results. Case files (test/cpython/*.cases.mjs) export an array of
// {js, py, name?} objects. A js snippet containing `return` runs as a function
// body; a py snippet containing `result =` is executed and `result` is used.
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import vm from 'node:vm'

const here = dirname(fileURLToPath(import.meta.url))

/** The first python on PATH that is 3.12 or newer, or null. */
export function findPython() {
    const candidates = [process.env.PYTHON, 'python3.13', 'python3.12', 'python3', 'python'].filter(Boolean)
    for (const exe of candidates) {
        const r = spawnSync(exe, ['-c', 'import sys; print(sys.version_info >= (3, 12))'], {encoding: 'utf8'})
        if (r.status === 0 && r.stdout.trim() === 'True') {
            return exe
        }
    }
    return null
}

export function runPython(python, snippets) {
    const r = spawnSync(python, [join(here, 'runner.py')], {
        input: JSON.stringify(snippets),
        encoding: 'utf8',
        maxBuffer: 1 << 28,
    })
    if (r.status !== 0) {
        throw new Error(`python failed: ${r.stderr}`)
    }
    return JSON.parse(r.stdout)
}

/** A fresh realm with the <script> build loaded, like a browser page. */
export function createContext() {
    const context = vm.createContext({console})
    const file = join(here, '..', '..', 'dist', 'pythonicjs.global.js')
    // the filename lets coverage tools map this code back to src/ via the source map
    vm.runInContext(readFileSync(file, 'utf8'), context, {filename: file})
    return context
}

const tag = (x) => Object.prototype.toString.call(x)

/** Normalizes a JS value the same way runner.py normalizes a Python value. */
export function norm(x) {
    if (x === null || x === undefined || typeof x === 'boolean') {
        return x ?? null
    }
    if (typeof x === 'number') {
        if (Number.isNaN(x)) {
            return {float: 'nan'}
        }
        if (!Number.isFinite(x)) {
            return {float: x > 0 ? 'inf' : '-inf'}
        }
        if (Number.isInteger(x) && Math.abs(x) > 2 ** 53) {
            return {int: BigInt(x).toString()}
        }
        return x + 0
    }
    if (typeof x === 'bigint') {
        return x >= -(2n ** 53n) && x <= 2n ** 53n ? Number(x) : {int: x.toString()}
    }
    if (typeof x === 'string') {
        return x
    }
    if (Array.isArray(x)) {
        return x.map(norm)
    }
    if (tag(x) === '[object Map]') {
        return {dict: Array.from(x.entries(), ([k, v]) => [norm(k), norm(v)])}
    }
    if (tag(x) === '[object Set]') {
        return {set: Array.from(x, norm).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1))}
    }
    if (typeof x === 'object' && typeof x[Symbol.iterator] === 'function') {
        return Array.from(x, norm)
    }
    if (typeof x === 'object' && Object.getPrototypeOf(Object.getPrototypeOf(x)) === null) {
        return {dict: Object.entries(x).map(([k, v]) => [k, norm(v)])}
    }
    return {repr: String(x)}
}

export function runJs(context, snippet) {
    const code = /\breturn\b/.test(snippet) ? `(() => {${snippet}})()` : `(${snippet})`
    try {
        return norm(vm.runInContext(code, context))
    } catch (e) {
        return {error: e?.name ?? 'Error'}
    }
}

// --- helpers for generating cases -----------------------------------------

/** A small seeded PRNG (mulberry32) so generated cases are reproducible. */
export function rng(seed) {
    let a = seed >>> 0
    const next = () => {
        a = (a + 0x6d2b79f5) >>> 0
        let t = a
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    return {
        next,
        int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
        pick: (xs) => xs[Math.floor(next() * xs.length)],
        ints: (n, lo, hi) => Array.from({length: n}, () => lo + Math.floor(next() * (hi - lo + 1))),
    }
}

/** A Python literal for a JSON-like JS value. */
export function py(value) {
    if (value === null || value === undefined) {
        return 'None'
    }
    if (value === true) {
        return 'True'
    }
    if (value === false) {
        return 'False'
    }
    if (typeof value === 'number') {
        if (Number.isNaN(value)) {
            return "float('nan')"
        }
        if (!Number.isFinite(value)) {
            return value > 0 ? "float('inf')" : "float('-inf')"
        }
        return Object.is(value, -0) ? '-0.0' : String(value)
    }
    if (typeof value === 'bigint') {
        return value.toString()
    }
    if (typeof value === 'string') {
        return JSON.stringify(value)
    }
    if (Array.isArray(value)) {
        return `[${value.map(py).join(', ')}]`
    }
    return `{${Object.entries(value)
        .map(([k, v]) => `${JSON.stringify(k)}: ${py(v)}`)
        .join(', ')}}`
}

/** A JavaScript literal for a JSON-like JS value. */
export function js(value) {
    if (value === undefined) {
        return 'undefined'
    }
    if (typeof value === 'number') {
        if (Number.isNaN(value)) {
            return 'NaN'
        }
        if (!Number.isFinite(value)) {
            return value > 0 ? 'Infinity' : '-Infinity'
        }
        return Object.is(value, -0) ? '-0' : String(value)
    }
    if (typeof value === 'bigint') {
        return `${value}n`
    }
    if (Array.isArray(value)) {
        return `[${value.map(js).join(', ')}]`
    }
    if (value !== null && typeof value === 'object') {
        return `{${Object.entries(value)
            .map(([k, v]) => `${JSON.stringify(k)}: ${js(v)}`)
            .join(', ')}}`
    }
    return JSON.stringify(value)
}
