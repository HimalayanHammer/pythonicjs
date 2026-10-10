import {js, py, rng} from './harness.mjs'

const cases = []
// a snippet containing `return` runs as a function body, so unwrap IIFEs
const body = (code) => (code.startsWith('(() => { ') && code.endsWith(' })()') ? code.slice(9, -5) : code)
const pair = (jsCode, pyCode) => cases.push({js: body(jsCode), py: pyCode})
const r = rng(11)

const sortedInts = (n) => r.ints(n, 0, 10).sort((a, b) => a - b)

for (let i = 0; i < 400; i++) {
    const keyed = r.next() < 0.35
    const a = keyed ? sortedInts(r.int(0, 12)).map((k, j) => [k, j]) : sortedInts(r.int(0, 12))
    const fn = r.pick(['bisect_left', 'bisect_right', 'bisect', 'insort_left', 'insort_right', 'insort'])
    const insort = fn.startsWith('insort')
    const k = r.int(-1, 11)
    // bisect_* compares x to key(item); insort_* applies key to x itself
    const x = keyed && insort ? [k, 99] : k
    const lo = r.pick([undefined, undefined, 0, r.int(0, a.length), r.int(0, a.length + 2), -1])
    const hi = lo === undefined ? undefined : r.pick([undefined, a.length, r.int(0, a.length), r.int(0, a.length + 3), -1, null])
    const jsArgs = [js(a), js(x)]
    const pyArgs = [py(a), py(x)]
    const options = r.next() < 0.5
    if (options) {
        const parts = []
        if (lo !== undefined) {
            parts.push(`lo: ${lo}`)
        }
        if (hi !== undefined) {
            parts.push(`hi: ${js(hi)}`)
        }
        if (keyed) {
            parts.push('key: (p) => p[0]')
        }
        jsArgs.push(`{${parts.join(', ')}}`)
    } else {
        if (lo !== undefined || keyed) {
            jsArgs.push(String(lo ?? 0))
        }
        if (hi !== undefined || keyed) {
            jsArgs.push(js(hi ?? null))
        }
        if (keyed) {
            jsArgs.push('(p) => p[0]')
        }
    }
    if (lo !== undefined) {
        pyArgs.push(String(lo))
    }
    if (hi !== undefined) {
        pyArgs.push(py(hi))
    }
    if (keyed) {
        pyArgs.push('key=lambda p: p[0]')
    }
    if (insort) {
        pair(
            `(() => { const a = ${jsArgs[0]}; bisect.${fn}(a, ${jsArgs.slice(1).join(', ')}); return a })()`,
            `(lambda a: (bisect.${fn}(a, ${pyArgs.slice(1).join(', ')}), a)[1])(${pyArgs[0]})`,
        )
    } else {
        pair(`bisect.${fn}(${jsArgs.join(', ')})`, `bisect.${fn}(${pyArgs.join(', ')})`)
    }
}

// strings, floats and tuples
for (let i = 0; i < 60; i++) {
    const words = Array.from({length: r.int(0, 8)}, () => r.pick(['a', 'ab', 'b', 'B', 'é', 'z', '', 'aa'])).sort((p, q) => (p < q ? -1 : p > q ? 1 : 0))
    const w = r.pick(['a', 'ab', 'c', '', 'zz', 'B'])
    pair(`bisect.bisect_left(${js(words)}, ${js(w)})`, `bisect.bisect_left(${py(words)}, ${py(w)})`)
    pair(`bisect.bisect_right(${js(words)}, ${js(w)})`, `bisect.bisect_right(${py(words)}, ${py(w)})`)
    const pairs = Array.from({length: r.int(0, 8)}, () => [r.int(0, 3), r.int(0, 3)]).sort((p, q) => p[0] - q[0] || p[1] - q[1])
    const t = [r.int(0, 3), r.int(0, 3)]
    pair(`(() => { const a = ${js(pairs)}; bisect.insort(a, ${js(t)}); return a })()`, `(lambda a: (bisect.insort(a, ${py(t)}), a)[1])(${py(pairs)})`)
}
for (let i = 0; i < 40; i++) {
    const xs = Array.from({length: r.int(0, 10)}, () => r.int(-8, 8) / 2).sort((a, b) => a - b)
    const x = r.int(-9, 9) / 2
    pair(`bisect.bisect_left(${js(xs)}, ${js(x)})`, `bisect.bisect_left(${py(xs)}, ${py(x)})`)
    pair(`bisect.bisect(${js(xs)}, ${js(x)})`, `bisect.bisect(${py(xs)}, ${py(x)})`)
}

// errors
pair('bisect.bisect([1, 2], 1, -1)', 'bisect.bisect([1, 2], 1, -1)')
pair('bisect.bisect([1, 2], 1, 0, 5)', 'bisect.bisect([1, 2], 1, 0, 5)')
pair("bisect.bisect([1, 2], 'a')", "bisect.bisect([1, 2], 'a')")
pair('bisect.bisect_left([1, 2], 1, 1.5)', 'bisect.bisect_left([1, 2], 1, 1.5)')
pair('(() => { const a = [1, 2]; bisect.insort(a, 3, 5); return a })()', '(lambda a: (bisect.insort(a, 3, 5), a)[1])([1, 2])')

export default cases
