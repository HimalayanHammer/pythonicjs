import {js, py, rng} from './harness.mjs'

const cases = []
// a snippet containing `return` runs as a function body, so unwrap IIFEs
const body = (code) => (code.startsWith('(() => { ') && code.endsWith(' })()') ? code.slice(9, -5) : code)
const pair = (jsCode, pyCode) => cases.push({js: body(jsCode), py: pyCode})
const r = rng(23)

// reduce
for (let i = 0; i < 40; i++) {
    const xs = r.ints(r.int(0, 8), -9, 9)
    pair(`functools.reduce((a, b) => a + b, ${js(xs)})`, `functools.reduce(lambda a, b: a + b, ${py(xs)})`)
    pair(`functools.reduce((a, b) => a * 2 - b, ${js(xs)}, 1)`, `functools.reduce(lambda a, b: a * 2 - b, ${py(xs)}, 1)`)
    pair(`functools.reduce((acc, x) => [...acc, x], ${js(xs)}, [])`, `functools.reduce(lambda acc, x: [*acc, x], ${py(xs)}, [])`)
}
pair("functools.reduce((a, b) => a + b, 'abc')", "functools.reduce(lambda a, b: a + b, 'abc')")
pair('functools.reduce((a, b) => a + b, [], 0)', 'functools.reduce(lambda a, b: a + b, [], 0)')
pair('functools.reduce((a, b) => a + b, [])', 'functools.reduce(lambda a, b: a + b, [])')
pair('functools.reduce((a, b) => a + b, 5)', 'functools.reduce(lambda a, b: a + b, 5)')
pair('functools.reduce((a, b) => a + b, [7])', 'functools.reduce(lambda a, b: a + b, [7])')

// partial
pair('functools.partial((a, b, c) => [a, b, c], 1)(2, 3)', 'functools.partial(lambda a, b, c: [a, b, c], 1)(2, 3)')
pair('functools.partial(functools.partial((a, b, c) => [a, b, c], 1), 2)(3)', 'functools.partial(functools.partial(lambda a, b, c: [a, b, c], 1), 2)(3)')
pair('functools.partial(functools.partial((a, b, c) => [a, b, c], 1), 2).args', 'functools.partial(functools.partial(lambda a, b, c: [a, b, c], 1), 2).args')
pair('functools.partial(Math.max, 5)(1, 9)', 'functools.partial(max, 5)(1, 9)')

// lru_cache: random call sequences, comparing which calls ran and the statistics
for (let i = 0; i < 200; i++) {
    const maxsize = r.pick([0, 1, 2, 3, 5, null, 128])
    const calls = Array.from({length: r.int(0, 25)}, () => r.pick([r.int(0, 6), [r.int(0, 2), r.int(0, 2)], r.pick(['a', 'b'])]))
    const jsCalls = calls.map((c) => `out.push(f(${js(c)}))`).join('\n')
    const pyCalls = calls.map((c) => `out.append(f(${Array.isArray(c) ? `(${c.join(', ')},)` : py(c)}))`).join('\n')
    pair(
        `const ran = []; const out = []
const f = functools.lru_cache(${js(maxsize)})((x) => { ran.push(x); return [x, ran.length] })
${jsCalls}
const info = f.cache_info()
return [ran, out, [info.hits, info.misses, info.maxsize, info.currsize]]`,
        `ran = []; out = []
@functools.lru_cache(maxsize=${py(maxsize)})
def f(x):
    ran.append(x)
    return [x, len(ran)]
${pyCalls}
result = [ran, out, list(f.cache_info())]`,
    )
}
// cache, cache_clear, several arguments, 1 == 1.0 == True share an entry
pair(
    `const ran = []; const f = functools.cache((a, b) => { ran.push([a, b]); return a + b })
const out = [f(1, 2), f(1, 2), f(2, 1), f(true, 2), f(1.0, 2)]
const before = f.cache_info(); f.cache_clear(); out.push(f(1, 2))
const after = f.cache_info()
return [ran, out, [before.hits, before.misses, before.maxsize, before.currsize], [after.hits, after.misses, after.maxsize, after.currsize]]`,
    `ran = []
@functools.cache
def f(a, b):
    ran.append([a, b])
    return a + b
out = [f(1, 2), f(1, 2), f(2, 1), f(True, 2), f(1.0, 2)]
before = f.cache_info(); f.cache_clear(); out.append(f(1, 2))
result = [ran, out, list(before), list(f.cache_info())]`,
)
pair(
    `const fib = functools.lru_cache(null)((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)))
const v = fib(30); const i = fib.cache_info(); return [v, i.hits, i.misses, i.currsize]`,
    `@functools.lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)
v = fib(30); i = fib.cache_info(); result = [v, i.hits, i.misses, i.currsize]`,
)
pair('functools.cache((x) => x)({a: 1})', 'functools.cache(lambda x: x)({"a": 1})')

// cmp_to_key with sorted, min, max and heapq
for (let i = 0; i < 40; i++) {
    const xs = r.ints(r.int(0, 12), 0, 30)
    // order by last digit, then descending
    const jsCmp = '(a, b) => (a % 10) - (b % 10) || b - a'
    const pyCmp = 'lambda a, b: (a % 10) - (b % 10) or b - a'
    pair(`sorted(${js(xs)}, {key: functools.cmp_to_key(${jsCmp})})`, `sorted(${py(xs)}, key=functools.cmp_to_key(${pyCmp}))`)
    pair(`heapq.nsmallest(3, ${js(xs)}, functools.cmp_to_key(${jsCmp}))`, `heapq.nsmallest(3, ${py(xs)}, key=functools.cmp_to_key(${pyCmp}))`)
    pair(`heapq.nlargest(4, ${js(xs)}, functools.cmp_to_key((a, b) => (a % 3) - (b % 3)))`, `heapq.nlargest(4, ${py(xs)}, key=functools.cmp_to_key(lambda a, b: (a % 3) - (b % 3)))`)
    if (xs.length) {
        pair(`max(${js(xs)}, {key: functools.cmp_to_key(${jsCmp})})`, `max(${py(xs)}, key=functools.cmp_to_key(${pyCmp}))`)
        pair(`min(${js(xs)}, {key: functools.cmp_to_key(${jsCmp})})`, `min(${py(xs)}, key=functools.cmp_to_key(${pyCmp}))`)
    }
}

export default cases
