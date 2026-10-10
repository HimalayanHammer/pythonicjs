import {js, py, rng} from './harness.mjs'

const cases = []
/** A case where the JS and Python source are the same text. */
const same = (code) => cases.push({js: code, py: code})
const pair = (jsCode, pyCode) => cases.push({js: jsCode, py: pyCode})

// round: half to even on the exact binary value
for (const x of [0.5, 1.5, 2.5, -0.5, -1.5, -2.5, 2.675, 1.005, 0.125, 0.375, 1e-7, 123.456, -123.456, 1e16, 5e-324]) {
    same(`round(${js(x)})`)
    for (const n of [0, 1, 2, 3, -1, -2]) {
        same(`round(${js(x)}, ${n})`)
    }
}
same('round(1250, -2)')
same('round(1350, -2)')
pair('round(NaN)', "round(float('nan'))")
pair('round(Infinity)', "round(float('inf'))")
pair('round(NaN, 2)', "round(float('nan'), 2)")
const r = rng(1)
for (let i = 0; i < 300; i++) {
    const x = (r.next() - 0.5) * 10 ** r.int(-3, 6)
    const n = r.int(-3, 6)
    same(`round(${js(x)}, ${n})`)
}
for (let i = 0; i < 100; i++) {
    const x = r.int(-1000, 1000) / 8
    same(`round(${js(x)})`)
    same(`round(${js(x)}, 1)`)
}

// int and float parsing
for (const s of [
    '42',
    ' -42 ',
    '+7',
    '1_000',
    '0x1f',
    '0b101',
    '0o17',
    '-0x1f',
    '12px',
    '',
    ' ',
    '1__0',
    '_1',
    '1_',
    '3.5',
    '١٢',
    '00',
    '0_0',
    '9007199254740993',
    '-123456789012345678901234567890',
]) {
    pair(`int(${js(s)})`, `int(${py(s)})`)
    pair(`int(${js(s)}, 0)`, `int(${py(s)}, 0)`)
    pair(`int(${js(s)}, 16)`, `int(${py(s)}, 16)`)
}
for (const [s, b] of [
    ['z', 36],
    ['Z', 36],
    ['10', 2],
    ['12', 2],
    ['777', 8],
    ['zz', 37],
    ['1', 1],
    ['0x10', 16],
    ['0x10', 10],
    ['010', 0],
]) {
    pair(`int(${js(s)}, ${b})`, `int(${py(s)}, ${b})`)
}
for (const x of [3.9, -3.9, 0.5, -0.5, 1e20, -1e20, 2 ** 53 + 2, true, false]) {
    pair(`int(${js(x)})`, `int(${py(x)})`)
}
for (const s of [
    '3.14',
    ' 1e3 ',
    '.5',
    '5.',
    '-.5e-3',
    'inf',
    '-Infinity',
    'nan',
    '1_000.5',
    '1__0',
    '_1',
    '',
    'abc',
    '1e',
    '0x10',
    '1.5.5',
    '+1E+2',
]) {
    pair(`float(${js(s)})`, `float(${py(s)})`)
}

// arithmetic
for (const [a, b] of [
    [7, 2],
    [-7, 2],
    [7, -2],
    [-7, -2],
    [7.5, 2],
    [-7.5, 2],
    [7.5, -2],
    [0, 3],
    [1, 0],
    [5.5, 0],
    [1e300, 1e-300],
]) {
    same(`divmod(${js(a)}, ${js(b)})`)
}
for (const [x, y, m] of [
    [3, 200, 1000000007],
    [2, 0, 1],
    [-2, 3, 5],
    [2, -1, 5],
    [3, -2, 7],
    [2, 3, -5],
    [4, -1, 8],
    [2, 3, 0],
    [12345, 6789, 99991],
]) {
    same(`pow(${x}, ${y}, ${m})`)
}
same('pow(2, 10)')
same('pow(2, -2)')
same('pow(0, -1)')
for (const xs of [
    [],
    [1, 2, 3],
    [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    [1e100, 1.5, -1e100],
    [0.1, 0.2, 0.3],
    [1e16, 1, 1, 1, 1],
]) {
    same(`sum(${js(xs)})`)
}
for (let i = 0; i < 100; i++) {
    const xs = Array.from({length: r.int(1, 20)}, () => (r.next() - 0.5) * 10 ** r.int(-5, 15))
    same(`sum(${js(xs)})`)
}
same('sum([1, 2], 10)')
pair("sum(['a', 'b'])", "sum(['a', 'b'])")
pair("sum(['a'], '')", "sum(['a'], '')")
same('sum([[1], [2, 3]], [])')
same('sum(42)')

// max / min / sorted
same('max(3, 1, 2)')
same('min(3, 1, 2)')
same("max(['pear', 'apple', 'zoo'])")
same("max('ab', 'b')")
pair('max([])', 'max([])')
pair('max([], {default: 0})', 'max([], default=0)')
pair("max(['a', 'abc', 'ab'], {key: len})", "max(['a', 'abc', 'ab'], key=len)")
pair("min([[2, 'b'], [1, 'z'], [1, 'a']])", "min([(2, 'b'), (1, 'z'), (1, 'a')])")
same("max(1, 'a')")
for (let i = 0; i < 60; i++) {
    const xs = r.ints(r.int(0, 15), -20, 20)
    same(`sorted(${js(xs)})`)
    pair(`sorted(${js(xs)}, {reverse: true})`, `sorted(${py(xs)}, reverse=True)`)
    pair(`sorted(${js(xs)}, {key: (x) => divmod(x, 3)[1]})`, `sorted(${py(xs)}, key=lambda x: x % 3)`)
    pair(`sorted(${js(xs)}, {key: (x) => abs(x), reverse: true})`, `sorted(${py(xs)}, key=lambda x: abs(x), reverse=True)`)
}
const words = ['banana', 'Apple', 'cherry', 'apple', 'éclair', 'Zebra', '😀', 'ｚ', '', 'a', 'ab']
same(`sorted(${js(words)})`)
pair(`sorted(${js(words)}, {key: len})`, `sorted(${py(words)}, key=len)`)
same("sorted('hello world')")
same("sorted([[1, 'b'], [1, 'a'], [0, 'z']])")
same("sorted([1, 'a'])")
pair('sorted([3, 1.5, true, 0])', 'sorted([3, 1.5, True, 0])')

// sequences
for (const args of [[5], [2, 8], [10, 0, -3], [0, 10, 3], [0, 5, -1], [-5, 5, 2], [1, 1]]) {
    same(`list(range(${args.join(', ')}))`)
    pair(`len(range(${args.join(', ')}))`, `len(range(${args.join(', ')}))`)
}
same('range(0, 5, 0)')
same('list(range(0, 1.5))')
const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const text = 'hello, world'
for (let i = 0; i < 200; i++) {
    const a = r.pick([null, r.int(-12, 12)])
    const b = r.pick([null, r.int(-12, 12)])
    const c = r.pick([null, 1, 2, 3, -1, -2, -3])
    const pyArgs = `${a ?? ''}:${b ?? ''}:${c ?? ''}`
    pair(`slice(${js(seq)}, ${a}, ${b}, ${c})`, `${py(seq)}[${pyArgs}]`)
    pair(`slice(${js(text)}, ${a}, ${b}, ${c})`, `${py(text)}[${pyArgs}]`)
    pair(`slice(range(3, 30, 4), ${a}, ${b}, ${c})`, `range(3, 30, 4)[${pyArgs}]`)
}
pair('slice([1, 2], null, null, 0)', '[1, 2][::0]')
pair("slice('😀a😀b', 1, null)", "'😀a😀b'[1:]")
same("len('😀ab')")
same('len(42)')
same("enumerate(['a', 'b'], 1)")
same("list(zip([1, 2, 3], 'ab'))")
pair('zip([1, 2], [3], {strict: true})', 'list(zip([1, 2], [3], strict=True))')
pair('zip([1], [3, 4], {strict: true})', 'list(zip([1], [3, 4], strict=True))')
same("list(reversed('abc'))")
same('any([0, "", []])')
same('all([1, "a", [0]])')
same('all([])')
pair('filter(null, [0, 1, "", "a", [], [2]])', 'list(filter(None, [0, 1, "", "a", [], [2]]))')
pair('map((a, b) => a + b, [1, 2, 3], [10, 20])', 'list(map(lambda a, b: a + b, [1, 2, 3], [10, 20]))')
pair('next(iter([]))', 'next(iter([]))')
pair("next(iter([]), 'done')", "next(iter([]), 'done')")
pair("count('banana', 'an')", "'banana'.count('an')")
pair("count('aaaa', 'aa')", "'aaaa'.count('aa')")
pair("count('abc', '')", "'abc'.count('')")
pair('count([[1], [1], 1], [1])', '[[1], [1], 1].count([1])')
pair('index([[1], [2]], [2])', '[[1], [2]].index([2])')

// conversions
for (const n of [0, 1, -1, 255, -255, 2 ** 40, 2 ** 53]) {
    same(`hex(${n})`)
    same(`oct(${n})`)
    same(`bin(${n})`)
}
same('hex(2.5)')
for (const c of [0, 97, 0x1f600, 0x10ffff, 0x110000, -1]) {
    same(`chr(${c})`)
}
for (const s of ['a', '😀', 'é', 'ab', '']) {
    same(`ord(${js(s)})`)
}
for (const v of [[], [0], {}, '', 'a', 0, 0.0, 1, null]) {
    pair(`bool(${js(v)})`, `bool(${py(v)})`)
}
pair('list({a: 1, b: 2})', "list({'a': 1, 'b': 2})")
same("list('abc')")

// zip and map stop at the shortest input, even when another is infinite
cases.push({js: "zip(itertools.count(), 'abc')", py: "list(zip(itertools.count(), 'abc'))"})
cases.push({
    js: 'map((a, b) => a * b, itertools.count(1), [10, 20])',
    py: 'list(map(lambda a, b: a * b, itertools.count(1), [10, 20]))',
})
cases.push({js: 'zip([1], [2], [3, 4], {strict: true})', py: 'list(zip([1], [2], [3, 4], strict=True))'})
export default cases
