import {js, py, rng} from './harness.mjs'

const cases = []
const same = (code) => cases.push({js: code, py: code})
// a snippet containing `return` runs as a function body, so unwrap IIFEs
const body = (code) => (code.startsWith('(() => { ') && code.endsWith(' })()') ? code.slice(9, -5) : code)
const pair = (jsCode, pyCode) => cases.push({js: body(jsCode), py: pyCode})
const r = rng(7)

/** A random value: ints with many duplicates, [int, str] tuples with ties, or strings. */
function valueMaker(kind) {
    if (kind === 'int') {
        return () => r.int(-5, 15)
    }
    if (kind === 'float') {
        return () => r.int(-20, 20) / 4
    }
    if (kind === 'tuple') {
        return () => [r.int(0, 4), r.pick(['a', 'b', 'c'])]
    }
    return () => r.pick(['pear', 'apple', 'fig', 'kiwi', 'Apple', 'é', 'z', ''])
}

// random push / pop / pushpop / replace scripts, comparing the heap layout and outputs
for (let n = 0; n < 250; n++) {
    const make = valueMaker(r.pick(['int', 'int', 'float', 'tuple', 'str']))
    const max = n % 3 === 0
    const initial = Array.from({length: r.int(0, 12)}, make)
    const jsLines = [
        `const h = ${js(initial)}`,
        'const out = []',
        `heapq.${max ? 'heapify_max' : 'heapify'}(h)`,
        'out.push(h.slice())',
    ]
    const pyLines = [`h = ${py(initial)}`, 'out = []', `heapq.${max ? '_heapify_max' : 'heapify'}(h)`, 'out.append(list(h))']
    let size = initial.length
    for (let i = 0; i < r.int(1, 30); i++) {
        const op = max ? r.pick(['pop', 'replace']) : r.pick(['push', 'push', 'pop', 'pushpop', 'replace'])
        const v = make()
        if ((op === 'pop' || op === 'replace') && size === 0) {
            continue
        }
        if (op === 'push') {
            jsLines.push(`heapq.heappush(h, ${js(v)})`)
            pyLines.push(`heapq.heappush(h, ${py(v)})`)
            size++
        } else if (op === 'pop') {
            jsLines.push(`out.push(heapq.${max ? 'heappop_max' : 'heappop'}(h))`)
            pyLines.push(`out.append(heapq.${max ? '_heappop_max' : 'heappop'}(h))`)
            size--
        } else if (op === 'pushpop') {
            jsLines.push(`out.push(heapq.heappushpop(h, ${js(v)}))`)
            pyLines.push(`out.append(heapq.heappushpop(h, ${py(v)}))`)
        } else {
            jsLines.push(`out.push(heapq.${max ? 'heapreplace_max' : 'heapreplace'}(h, ${js(v)}))`)
            pyLines.push(`out.append(heapq.${max ? '_heapreplace_max' : 'heapreplace'}(h, ${py(v)}))`)
        }
        jsLines.push('out.push(h.slice())')
        pyLines.push('out.append(list(h))')
    }
    pair(`${jsLines.join('\n')}\nreturn out`, `${pyLines.join('\n')}\nresult = out`)
}

// heapify layouts, including large arrays (CPython uses a cache-friendly order above 2500 items)
for (const size of [0, 1, 2, 3, 7, 8, 100, 3000]) {
    const xs = r.ints(size, 0, 50)
    pair(`(() => { const h = ${js(xs)}; heapq.heapify(h); return h })()`, `(lambda h: (heapq.heapify(h), h)[1])(${py(xs)})`)
    pair(
        `(() => { const h = ${js(xs)}; heapq.heapify_max(h); return h })()`,
        `(lambda h: (heapq._heapify_max(h), h)[1])(${py(xs)})`,
    )
}

// heap sort and errors
for (let i = 0; i < 20; i++) {
    const xs = r.ints(r.int(0, 20), -9, 9)
    pair(
        `(() => { const h = []; for (const x of ${js(xs)}) heapq.heappush(h, x); const out = []; while (h.length) out.push(heapq.heappop(h)); return out })()`,
        `(lambda h: [heapq.heappush(h, x) for x in ${py(xs)}] and [heapq.heappop(h) for _ in range(len(h))] or [])([])`,
    )
}
pair('heapq.heappop([])', 'heapq.heappop([])')
pair('heapq.heapreplace([], 1)', 'heapq.heapreplace([], 1)')
same('heapq.heappushpop([], 1)')
pair("(() => { const h = [1, 2]; heapq.heappush(h, 'a'); return h })()", "(lambda h: (heapq.heappush(h, 'a'), h)[1])([1, 2])")
pair("(() => { const h = [1, 'a']; heapq.heapify(h); return h })()", "(lambda h: (heapq.heapify(h), h)[1])([1, 'a'])")

// nlargest / nsmallest: sized and unsized inputs, keys, ties, n around the size
const gen = (xs) => `(function* () { yield* ${js(xs)} })()`
for (let i = 0; i < 200; i++) {
    const kind = r.pick(['int', 'tuple', 'str', 'float'])
    const make = valueMaker(kind)
    const xs = Array.from({length: r.int(0, 25)}, make)
    const n = r.pick([-1, 0, 1, 2, 3, 5, xs.length - 1, xs.length, xs.length + 2])
    const fn = r.pick(['nlargest', 'nsmallest'])
    const sized = r.next() < 0.5
    const src = sized ? js(xs) : gen(xs)
    const pySrc = sized ? py(xs) : `iter(${py(xs)})`
    if (kind === 'tuple') {
        pair(`heapq.${fn}(${n}, ${src}, (x) => x[0])`, `heapq.${fn}(${n}, ${pySrc}, key=lambda x: x[0])`)
    } else if (kind === 'str') {
        pair(`heapq.${fn}(${n}, ${src}, len)`, `heapq.${fn}(${n}, ${pySrc}, key=len)`)
    } else if (kind === 'int' && r.next() < 0.5) {
        pair(`heapq.${fn}(${n}, ${src}, abs)`, `heapq.${fn}(${n}, ${pySrc}, key=abs)`)
    } else {
        pair(`heapq.${fn}(${n}, ${src})`, `heapq.${fn}(${n}, ${pySrc})`)
    }
}
pair("heapq.nlargest(2, 'hello')", "heapq.nlargest(2, 'hello')")
pair('heapq.nsmallest(2, 5)', 'heapq.nsmallest(2, 5)')

// merge: stability across iterables, keys, reverse, empty inputs
for (let i = 0; i < 120; i++) {
    const count = r.int(0, 5)
    const reverse = r.next() < 0.3
    const keyed = r.next() < 0.5
    const lists = Array.from({length: count}, (_, j) => {
        const xs = Array.from({length: r.int(0, 8)}, () => (keyed ? [r.int(0, 6), j] : r.int(0, 9)))
        xs.sort((a, b) => (keyed ? a[0] - b[0] : a - b))
        if (reverse) {
            xs.reverse()
        }
        return xs
    })
    const opts = []
    const pyOpts = []
    if (keyed) {
        opts.push('key: (x) => x[0]')
        pyOpts.push('key=lambda x: x[0]')
    }
    if (reverse) {
        opts.push('reverse: true')
        pyOpts.push('reverse=True')
    }
    const jsArgs = lists.map(js)
    if (opts.length) {
        jsArgs.push(`{${opts.join(', ')}}`)
    }
    pair(`[...heapq.merge(${jsArgs.join(', ')})]`, `list(heapq.merge(${[...lists.map(py), ...pyOpts].join(', ')}))`)
}
pair("[...heapq.merge('ace', 'bdf')]", "list(heapq.merge('ace', 'bdf'))")

export default cases
