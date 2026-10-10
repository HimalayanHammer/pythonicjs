import {js, py, rng} from './harness.mjs'

const cases = []
/** A case where the JS and Python source are the same text. */
const same = (code) => cases.push({js: code, py: code})
const pair = (jsCode, pyCode) => cases.push({js: jsCode, py: pyCode})
const r = rng(2024)

/** Lists of small ints, often empty or with runs of equal items. */
const randList = (max = 8, lo = -3, hi = 5) => r.ints(r.int(0, max), lo, hi)
const randStr = (max = 6) => Array.from({length: r.int(0, max)}, () => r.pick(['a', 'b', 'c', 'd'])).join('')

/** [js, py] predicate pairs that compute the same thing. */
const predicates = () => {
    const t = r.int(-2, 4)
    return r.pick([
        [`(x) => x > ${t}`, `lambda x: x > ${t}`],
        [`(x) => x < ${t}`, `lambda x: x < ${t}`],
        ['(x) => Math.floor(x / 2) * 2 === x', 'lambda x: x % 2 == 0'],
        [`(x) => x - ${t}`, `lambda x: x - ${t}`],
        ['(x) => x', 'lambda x: x'],
    ])
}

// --- count ------------------------------------------------------------------
for (let i = 0; i < 40; i++) {
    const start = r.pick([0, 1, -5, 10, 0.5, -2.25])
    const step = r.pick([1, 2, -1, 0, 3, 0.1, 0.25, -0.5])
    const n = r.int(0, 8)
    same(`itertools.islice(itertools.count(${js(start)}, ${js(step)}), ${n})`)
}
same('itertools.islice(itertools.count(), 5)')
same('itertools.islice(itertools.count(7), 3)')
pair('itertools.islice(itertools.count(true), 3)', 'itertools.islice(itertools.count(True), 3)')
same("itertools.count('a')")
same("itertools.count(1, 'a')")
pair('itertools.islice(itertools.count(2n ** 60n, 1n), 2)', 'itertools.islice(itertools.count(2 ** 60, 1), 2)')

// --- cycle ------------------------------------------------------------------
for (let i = 0; i < 25; i++) {
    const xs = randList(4)
    const n = r.int(0, 12)
    same(`itertools.islice(itertools.cycle(${js(xs)}), ${n})`)
}
same("itertools.islice(itertools.cycle('abc'), 8)")
same('itertools.cycle(5)')
pair('const it = iter([1, 2, 3]); const c = itertools.cycle(it); next(c); next(it, null); return list(itertools.islice(c, 6))',
    'it = iter([1, 2, 3]); c = itertools.cycle(it); next(c); next(it, None); result = list(itertools.islice(c, 6))')

// --- repeat -----------------------------------------------------------------
for (const n of [-2, -1, 0, 1, 3]) {
    same(`itertools.repeat('x', ${n})`)
}
same('itertools.islice(itertools.repeat(7), 4)')
same('itertools.repeat(1, 1.5)')
pair('itertools.repeat([1], 2)', 'itertools.repeat([1], 2)')

// --- accumulate ---------------------------------------------------------------
for (let i = 0; i < 40; i++) {
    const xs = randList()
    same(`itertools.accumulate(${js(xs)})`)
    pair(`itertools.accumulate(${js(xs)}, (a, b) => max(a, b))`, `itertools.accumulate(${py(xs)}, max)`)
    pair(`itertools.accumulate(${js(xs)}, (a, b) => a * b)`, `itertools.accumulate(${py(xs)}, lambda a, b: a * b)`)
    const init = r.int(-5, 5)
    pair(`itertools.accumulate(${js(xs)}, null, {initial: ${init}})`, `itertools.accumulate(${py(xs)}, None, initial=${init})`)
    pair(`itertools.accumulate(${js(xs)}, {initial: ${init}})`, `itertools.accumulate(${py(xs)}, initial=${init})`)
    pair(`itertools.accumulate(${js(xs)}, (a, b) => a - b, ${init})`, `itertools.accumulate(${py(xs)}, lambda a, b: a - b, initial=${init})`)
}
same("itertools.accumulate('abc')")
same('itertools.accumulate([[1], [2, 3], []])')
pair('itertools.accumulate([1.5, 2, true])', 'itertools.accumulate([1.5, 2, True])')
pair('itertools.accumulate([1, 2], null, {initial: null})', 'itertools.accumulate([1, 2], None, initial=None)')
pair('itertools.accumulate([], {initial: 3})', 'itertools.accumulate([], initial=3)')
same("itertools.accumulate([1, 'a'])")
same('itertools.accumulate(3)')
pair("itertools.accumulate([1, 2], (acc, x) => acc + String(x), '')", "itertools.accumulate([1, 2], lambda acc, x: acc + str(x), initial='')")

// --- batched ------------------------------------------------------------------
for (let i = 0; i < 50; i++) {
    const xs = randList(10)
    const n = r.int(-1, 5)
    same(`itertools.batched(${js(xs)}, ${n})`)
    pair(`itertools.batched(${js(xs)}, ${n}, {strict: true})`, `itertools.batched(${py(xs)}, ${n}, strict=True)`)
}
same("itertools.batched('abcdefg', 3)")
same('itertools.batched([1, 2], 1.5)')
same('itertools.batched(5, 2)')
pair('itertools.islice(itertools.batched(itertools.count(), 3), 2)', 'itertools.islice(itertools.batched(itertools.count(), 3), 2)')
pair('const out = []; try { for (const b of itertools.batched([1, 2, 3, 4, 5], 2, {strict: true})) out.push(b) } catch (e) { out.push(e.name) } return out',
    'out = []\ntry:\n    for b in itertools.batched([1, 2, 3, 4, 5], 2, strict=True): out.append(b)\nexcept Exception as e:\n    out.append(type(e).__name__)\nresult = out')

// --- chain --------------------------------------------------------------------
for (let i = 0; i < 25; i++) {
    const parts = Array.from({length: r.int(0, 4)}, () => randList(3))
    same(`itertools.chain(${parts.map(js).join(', ')})`)
    same(`itertools.chain.from_iterable(${js(parts)})`)
}
same("itertools.chain('ab', [1], '', 'c')")
same("itertools.chain.from_iterable(['ab', 'cd'])")
same('itertools.chain([1], 2)')
same('itertools.chain.from_iterable(5)')
same('itertools.islice(itertools.chain.from_iterable(itertools.repeat([1, 2])), 5)')
same('itertools.chain()')

// --- compress -----------------------------------------------------------------
for (let i = 0; i < 30; i++) {
    const xs = randList()
    const sel = r.ints(r.int(0, 9), 0, 1)
    same(`itertools.compress(${js(xs)}, ${js(sel)})`)
}
pair("itertools.compress('ABCDEF', [1, 0, 1, 0, 1, 1])", "itertools.compress('ABCDEF', [1, 0, 1, 0, 1, 1])")
pair("itertools.compress('abcd', ['', 'x', [], [0]])", "itertools.compress('abcd', ['', 'x', [], [0]])")
same('itertools.compress(itertools.count(), [1, 0, 1])')

// --- dropwhile / takewhile / filterfalse --------------------------------------
for (let i = 0; i < 50; i++) {
    const xs = randList(10)
    const [jp, pp] = predicates()
    pair(`itertools.dropwhile(${jp}, ${js(xs)})`, `itertools.dropwhile(${pp}, ${py(xs)})`)
    pair(`itertools.takewhile(${jp}, ${js(xs)})`, `itertools.takewhile(${pp}, ${py(xs)})`)
    pair(`itertools.filterfalse(${jp}, ${js(xs)})`, `itertools.filterfalse(${pp}, ${py(xs)})`)
    pair(`itertools.filterfalse(null, ${js(xs)})`, `itertools.filterfalse(None, ${py(xs)})`)
    // what is left of a shared iterator afterwards
    pair(`const it = iter(${js(xs)}); const a = list(itertools.takewhile(${jp}, it)); return [a, list(it)]`,
        `it = iter(${py(xs)}); a = list(itertools.takewhile(${pp}, it)); result = [a, list(it)]`)
}
pair("itertools.filterfalse(null, [0, '', [], 'a', [0], null])", "itertools.filterfalse(None, [0, '', [], 'a', [0], None])")
pair('itertools.takewhile(null, 5)', 'itertools.takewhile(None, 5)')
pair('itertools.islice(itertools.dropwhile((x) => x < 5, itertools.count()), 3)', 'itertools.islice(itertools.dropwhile(lambda x: x < 5, itertools.count()), 3)')
pair('itertools.takewhile((x) => x < 5, itertools.count())', 'itertools.takewhile(lambda x: x < 5, itertools.count())')

// --- groupby --------------------------------------------------------------------
const keys = [
    ['null', 'None'],
    ['(x) => Math.floor(x / 2)', 'lambda x: x // 2'],
    ['(x) => x > 0', 'lambda x: x > 0'],
    ['(x) => abs(x)', 'lambda x: abs(x)'],
]
for (let i = 0; i < 60; i++) {
    const xs = r.ints(r.int(0, 10), -2, 2).sort((a, b) => (r.next() < 0.6 ? a - b : 0))
    const [jk, pk] = r.pick(keys)
    pair(`Array.from(itertools.groupby(${js(xs)}, ${jk}), ([k, g]) => [k, list(g)])`,
        `[[k, list(g)] for k, g in itertools.groupby(${py(xs)}, ${pk})]`)
    pair(`Array.from(itertools.groupby(${js(xs)}), ([k, g]) => [k, list(g)])`,
        `[[k, list(g)] for k, g in itertools.groupby(${py(xs)})]`)
    pair(`list(itertools.groupby(${js(xs)}, ${jk})).map(([k]) => k)`, `[k for k, g in itertools.groupby(${py(xs)}, ${pk})]`)
}
pair("Array.from(itertools.groupby('AAAABBBCCDAABBB'), ([k, g]) => [k, list(g)])", "[[k, list(g)] for k, g in itertools.groupby('AAAABBBCCDAABBB')]")
pair('Array.from(itertools.groupby([1, true, 1, 0, false]), ([k, g]) => [k, list(g)])', '[[k, list(g)] for k, g in itertools.groupby([1, True, 1, 0, False])]')
pair("Array.from(itertools.groupby([[1, 'a'], [1, 'b'], [2, 'c']], (p) => p[0]), ([k, g]) => [k, list(g)])",
    "[[k, list(g)] for k, g in itertools.groupby([(1, 'a'), (1, 'b'), (2, 'c')], lambda p: p[0])]")
same('itertools.groupby(5)')
// scripts that interleave the outer iterator with the groups; they also log
// every key call and what is left of the source, so consumption must match
for (let i = 0; i < 250; i++) {
    const xs = r.ints(r.int(0, 10), 0, 2).sort((a, b) => (r.next() < 0.7 ? a - b : 0))
    const [jk, pk] = r.pick(keys)
    const jsKey = jk === 'null' ? '(x) => x' : jk
    const pyKey = pk === 'None' ? 'lambda x: x' : pk
    const jsLines = [
        `const src = iter(${js(xs)}); const calls = []; const kf = ${jsKey};`,
        'const gb = itertools.groupby(src, (x) => { calls.push(x); return kf(x) }); const groups = []; const out = [];',
    ]
    const pyLines = [
        `src = iter(${py(xs)}); calls = []; kf = ${pyKey}`,
        'def key(x):\n    calls.append(x)\n    return kf(x)',
        'gb = itertools.groupby(src, key); groups = []; out = []',
    ]
    const steps = r.int(1, 16)
    for (let k = 0; k < steps; k++) {
        if (r.next() < 0.4) {
            jsLines.push("{ const x = next(gb, null); if (x === null) { out.push('END') } else { groups.push(x[1]); out.push(['key', x[0]]) } }")
            pyLines.push("x = next(gb, None)\nif x is None: out.append('END')\nelse: groups.append(x[1]); out.append(['key', x[0]])")
        } else {
            const g = r.int(0, 3)
            jsLines.push(`out.push(${g} < groups.length ? next(groups[${g}], 'END') : 'NOGROUP')`)
            pyLines.push(`out.append(next(groups[${g}], 'END') if ${g} < len(groups) else 'NOGROUP')`)
        }
    }
    jsLines.push('out.push(calls.slice(), list(src), groups.map((g) => list(g))); return out')
    pyLines.push('out.extend([calls[:], list(src), [list(g) for g in groups]]); result = out')
    pair(jsLines.join('\n'), pyLines.join('\n'))
}
pair("const gb = itertools.groupby('aabbb'); const [, g1] = next(gb); next(g1); const [, g2] = next(gb); return [list(g1), list(g2)]",
    "gb = itertools.groupby('aabbb'); _, g1 = next(gb); next(g1); _, g2 = next(gb); result = [list(g1), list(g2)]")

// --- islice -----------------------------------------------------------------------
const sliceArg = () => r.pick([null, null, r.int(0, 12), r.int(0, 12), r.int(-3, -1), 1.5, true])
for (let i = 0; i < 120; i++) {
    const xs = Array.from({length: r.int(0, 12)}, (_, k) => k * 10)
    const nargs = r.int(1, 3)
    const args = Array.from({length: nargs}, () => sliceArg())
    if (nargs === 3 && r.next() < 0.7) {
        args[2] = r.pick([null, 1, 2, 3, 0, -1, 2.5])
    }
    const jsArgs = args.map(js).join(', ')
    const pyArgs = args.map(py).join(', ')
    pair(`itertools.islice(${js(xs)}, ${jsArgs})`, `itertools.islice(${py(xs)}, ${pyArgs})`)
    // on an infinite iterator (with a finite stop)
    const finite = args.slice()
    if (finite[nargs === 1 ? 0 : 1] === null) {
        finite[nargs === 1 ? 0 : 1] = 50
    }
    pair(`itertools.islice(itertools.count(), ${finite.map(js).join(', ')})`, `itertools.islice(itertools.count(), ${finite.map(py).join(', ')})`)
    // consumption of a shared iterator
    pair(`const it = iter(range(15)); const a = list(itertools.islice(it, ${jsArgs})); return [a, list(it)]`,
        `it = iter(range(15)); a = list(itertools.islice(it, ${pyArgs})); result = [a, list(it)]`)
}
// the cases from the CPython docs and tests
for (const args of ['2', '2, 4', '2, null', '0, null, 2', '5, 3', '1, 10, 3', '3, 3', 'null', 'null, null, null']) {
    pair(`itertools.islice('ABCDEFG', ${args})`, `itertools.islice('ABCDEFG', ${args.replaceAll('null', 'None')})`)
}
same('itertools.islice([1, 2, 3], -1)')
same('itertools.islice([1, 2, 3], -2)')
same('itertools.islice([1, 2, 3], 1, -1)')
same('itertools.islice([1, 2, 3], 0, 2, 0)')
same('itertools.islice(5, 2)')
pair('itertools.islice(5, -1)', 'itertools.islice(5, -1)')
pair('itertools.islice([1, 2, 3], 2 ** 64)', 'itertools.islice([1, 2, 3], 2 ** 64)')
pair('const it = iter(range(10)); list(itertools.islice(it, 5, 3)); return list(it)',
    'it = iter(range(10)); list(itertools.islice(it, 5, 3)); result = list(it)')
pair('const it = iter(range(10)); const s = itertools.islice(it, 1, 7, 3); return [next(s), list(it)]',
    'it = iter(range(10)); s = itertools.islice(it, 1, 7, 3); result = [next(s), list(it)]')

// --- pairwise -----------------------------------------------------------------------
for (let i = 0; i < 20; i++) {
    same(`itertools.pairwise(${js(randList())})`)
}
same("itertools.pairwise('ABCDEFG')")
same('itertools.islice(itertools.pairwise(itertools.count()), 3)')
same('itertools.pairwise(1)')

// --- product --------------------------------------------------------------------------
for (let i = 0; i < 60; i++) {
    const pools = Array.from({length: r.int(0, 3)}, () => (r.next() < 0.3 ? randStr(3) : randList(3)))
    const jsPools = pools.map(js).join(', ')
    const pyPools = pools.map(py).join(', ')
    same(`itertools.product(${jsPools})`)
    const rep = r.int(-1, 3)
    pair(`itertools.product(${jsPools}${pools.length ? ', ' : ''}{repeat: ${rep}})`, `itertools.product(${pyPools}${pools.length ? ', ' : ''}repeat=${rep})`)
}
same("itertools.product('ABCD', 'xy')")
pair('itertools.product(range(2), {repeat: 3})', 'itertools.product(range(2), repeat=3)')
same('itertools.product([1], 5)')
pair('itertools.product([1, 2], {repeat: 1.5})', 'itertools.product([1, 2], repeat=1.5)')
pair('len(list(itertools.product(range(4), range(5), range(3))))', 'len(list(itertools.product(range(4), range(5), range(3))))')

// --- permutations / combinations / combinations_with_replacement ------------------------
for (let i = 0; i < 80; i++) {
    const xs = r.next() < 0.3 ? randStr(5) : r.ints(r.int(0, 5), 0, 9)
    const rr = r.pick([null, r.int(-1, 6), r.int(0, 4), r.int(0, 4)])
    pair(`itertools.permutations(${js(xs)}, ${js(rr)})`, `itertools.permutations(${py(xs)}, ${py(rr)})`)
    if (rr !== null) {
        same(`itertools.combinations(${js(xs)}, ${rr})`)
        same(`itertools.combinations_with_replacement(${js(xs)}, ${rr})`)
    }
}
same("itertools.permutations('ABCD', 2)")
same('itertools.permutations(range(3))')
same('itertools.permutations([])')
same('itertools.permutations([1, 2], 1.5)')
same('itertools.permutations(5)')
same("itertools.combinations('ABCD', 2)")
same('itertools.combinations(range(4), 3)')
same('itertools.combinations([], 0)')
same('itertools.combinations([1, 2], 1.5)')
same('itertools.combinations([1, 2], -1)')
same("itertools.combinations_with_replacement('ABC', 2)")
same('itertools.combinations_with_replacement([], 0)')
same('itertools.combinations_with_replacement([], 2)')
same('itertools.combinations_with_replacement([1], -1)')
pair('len(list(itertools.permutations(range(6))))', 'len(list(itertools.permutations(range(6))))')
pair('list(itertools.permutations(range(5), 3))', 'list(itertools.permutations(range(5), 3))')
pair('len(list(itertools.combinations(range(12), 5)))', 'len(list(itertools.combinations(range(12), 5)))')
pair('len(list(itertools.combinations_with_replacement(range(6), 4)))', 'len(list(itertools.combinations_with_replacement(range(6), 4)))')

// --- starmap --------------------------------------------------------------------------
for (let i = 0; i < 15; i++) {
    const pairs = Array.from({length: r.int(0, 5)}, () => [r.int(-3, 5), r.int(0, 3)])
    pair(`itertools.starmap(pow, ${js(pairs)})`, `itertools.starmap(pow, ${py(pairs)})`)
    pair(`itertools.starmap((a, b) => a * 10 + b, ${js(pairs)})`, `itertools.starmap(lambda a, b: a * 10 + b, ${py(pairs)})`)
}
pair("itertools.starmap((a, b) => a + b, ['ab', 'cd'])", "itertools.starmap(lambda a, b: a + b, ['ab', 'cd'])")
pair('itertools.starmap((a) => a, [1])', 'itertools.starmap(lambda a: a, [1])')

// --- tee ------------------------------------------------------------------------------
for (let i = 0; i < 60; i++) {
    const k = r.int(0, 6)
    const n = r.int(0, 3)
    const jsLines = [`const src = iter(range(${k})); const ts = itertools.tee(src, ${n}); const out = [len(ts)];`]
    const pyLines = [`src = iter(range(${k})); ts = itertools.tee(src, ${n}); out = [len(ts)]`]
    for (let s = 0; s < r.int(1, 14); s++) {
        if (r.next() < 0.1) {
            jsLines.push("out.push(['src', next(src, 'END')])")
            pyLines.push("out.append(['src', next(src, 'END')])")
        } else if (n > 0) {
            const t = r.int(0, n - 1)
            jsLines.push(`out.push([${t}, next(ts[${t}], 'END')])`)
            pyLines.push(`out.append([${t}, next(ts[${t}], 'END')])`)
        }
    }
    jsLines.push('out.push(ts.map((t) => list(t))); return out')
    pyLines.push('out.append([list(t) for t in ts]); result = out')
    pair(jsLines.join('\n'), pyLines.join('\n'))
}
same('itertools.tee([1, 2], -1)')
same('itertools.tee(5)')
same('len(itertools.tee("abc", 3))')
pair("itertools.tee('abc').map((t) => list(t))", "[list(t) for t in itertools.tee('abc')]")
pair('itertools.tee(itertools.count(), 2).map((t) => list(itertools.islice(t, 3)))', '[list(itertools.islice(t, 3)) for t in itertools.tee(itertools.count(), 2)]')

// --- zip_longest ----------------------------------------------------------------------
for (let i = 0; i < 50; i++) {
    const lists = Array.from({length: r.int(0, 4)}, () => (r.next() < 0.2 ? randStr(4) : randList(5)))
    const jsLists = lists.map(js).join(', ')
    const pyLists = lists.map(py).join(', ')
    same(`itertools.zip_longest(${jsLists})`)
    const fill = r.pick([0, -1, 'x', null, [1]])
    pair(`itertools.zip_longest(${jsLists}${lists.length ? ', ' : ''}{fillvalue: ${js(fill)}})`,
        `itertools.zip_longest(${pyLists}${lists.length ? ', ' : ''}fillvalue=${py(fill)})`)
}
pair("itertools.zip_longest('ABCD', 'xy', {fillvalue: '-'})", "itertools.zip_longest('ABCD', 'xy', fillvalue='-')")
same('itertools.zip_longest([1], 2)')
same('itertools.islice(itertools.zip_longest(itertools.count(), [1, 2]), 4)')
pair('const a = iter([1, 2, 3]); const b = iter([1]); const z = itertools.zip_longest(a, b); next(z); next(z); return [list(z), list(a), list(b)]',
    'a = iter([1, 2, 3]); b = iter([1]); z = itertools.zip_longest(a, b); next(z); next(z); result = [list(z), list(a), list(b)]')

// --- recipes, checked against the code in the itertools documentation -----------------
const RECIPES = `
import collections
from itertools import *

def take(n, iterable):
    return list(islice(iterable, n))

def nth(iterable, n, default=None):
    return next(islice(iterable, n, None), default)

def first_true(iterable, default=False, predicate=None):
    return next(filter(predicate, iterable), default)

def unique_everseen(iterable, key=None):
    seen = set()
    if key is None:
        for element in filterfalse(seen.__contains__, iterable):
            seen.add(element)
            yield element
    else:
        for element in iterable:
            k = key(element)
            if k not in seen:
                seen.add(k)
                yield element

def sliding_window(iterable, n):
    iterator = iter(iterable)
    window = collections.deque(islice(iterator, n - 1), maxlen=n)
    for x in iterator:
        window.append(x)
        yield tuple(window)

def roundrobin(*iterables):
    iterators = map(iter, iterables)
    for num_active in range(len(iterables), 0, -1):
        iterators = cycle(islice(iterators, num_active))
        yield from map(next, iterators)

def partition(predicate, iterable):
    t1, t2 = tee(iterable)
    return filterfalse(predicate, t1), filter(predicate, t2)

def quantify(iterable, predicate=bool):
    return sum(map(predicate, iterable))
`
const recipe = (jsCode, pyExpr) => pair(jsCode, `${RECIPES}\nresult = ${pyExpr}`)

for (let i = 0; i < 40; i++) {
    const xs = randList(8)
    const n = r.int(-1, 9)
    recipe(`itertools.take(${n}, ${js(xs)})`, `take(${n}, ${py(xs)})`)
    recipe(`itertools.nth(${js(xs)}, ${n})`, `nth(${py(xs)}, ${n})`)
    recipe(`itertools.nth(${js(xs)}, ${n}, 'none')`, `nth(${py(xs)}, ${n}, 'none')`)
    const [jp, pp] = predicates()
    recipe(`itertools.first_true(${js(xs)})`, `first_true(${py(xs)})`)
    recipe(`itertools.first_true(${js(xs)}, 'none', ${jp})`, `first_true(${py(xs)}, 'none', ${pp})`)
    recipe(`itertools.unique_everseen(${js(xs)})`, `unique_everseen(${py(xs)})`)
    recipe(`itertools.unique_everseen(${js(xs)}, (x) => abs(x))`, `unique_everseen(${py(xs)}, abs)`)
    recipe(`itertools.sliding_window(${js(xs)}, ${n})`, `sliding_window(${py(xs)}, ${n})`)
    const parts = Array.from({length: r.int(0, 4)}, () => (r.next() < 0.3 ? randStr(3) : randList(4)))
    recipe(`itertools.roundrobin(${parts.map(js).join(', ')})`, `roundrobin(${parts.map(py).join(', ')})`)
    const t = r.int(-2, 4)
    recipe(`itertools.partition((x) => x > ${t}, ${js(xs)})`, `partition(lambda x: x > ${t}, ${py(xs)})`)
    recipe(`itertools.quantify(${js(xs)})`, `quantify(${py(xs)})`)
    recipe(`itertools.quantify(${js(xs)}, (x) => x > ${t})`, `quantify(${py(xs)}, lambda x: x > ${t})`)
}
recipe("itertools.take(3, itertools.count(10))", 'take(3, count(10))')
recipe('itertools.nth(itertools.count(), 1000)', 'nth(count(), 1000)')
recipe("itertools.unique_everseen('AAAABBBCCDAABBB')", "unique_everseen('AAAABBBCCDAABBB')")
recipe("itertools.unique_everseen('ABBcCAD', (s) => s.toLowerCase())", "unique_everseen('ABBcCAD', str.lower)")
recipe('itertools.unique_everseen([1, true, 0, false, 1.0, 2])', 'unique_everseen([1, True, 0, False, 1.0, 2])')
recipe('itertools.unique_everseen([[1, 2], [1, 2], [2, 1]])', 'unique_everseen([(1, 2), (1, 2), (2, 1)])')
recipe("itertools.sliding_window('ABCDEFG', 4)", "sliding_window('ABCDEFG', 4)")
recipe('itertools.sliding_window([1, 2, 3], 1)', 'sliding_window([1, 2, 3], 1)')
recipe("itertools.roundrobin('ABC', 'D', 'EF')", "roundrobin('ABC', 'D', 'EF')")
recipe('itertools.roundrobin()', 'roundrobin()')
recipe("itertools.first_true([0, '', null])", "first_true([0, '', None])")
recipe('itertools.first_true([], 7)', 'first_true([], 7)')
recipe('itertools.partition(null, [0, 1, 2, null, 3])', 'partition(None, [0, 1, 2, None, 3])')
recipe("itertools.quantify(['', 'a', [], [0]])", "quantify(['', 'a', [], [0]])")

export default cases
