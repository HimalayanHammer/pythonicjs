// str methods: strip/split/partition/find/replace/padding/case/predicates.
import {js, py, rng} from './harness.mjs'

const cases = []
const pair = (jsCode, pyCode) => cases.push({js: jsCode, py: pyCode})
/** fn(s, ...args) in JS against s.fn(*args) in Python. */
const method = (fn, s, ...args) => pair(`${fn}(${[s, ...args].map(js).join(', ')})`, `${py(s)}.${fn}(${args.map(py).join(', ')})`)

const r = rng(2024)

// Building blocks for random strings: ASCII, every kind of Python whitespace
// and line break, Latin/Greek/Cyrillic/CJK, digits of other scripts,
// characters with special case mappings, combining marks and emoji.
const ALPHABET = [
    'a',
    'b',
    'c',
    'A',
    'B',
    'Z',
    'x',
    'y',
    '0',
    '1',
    '9',
    ' ',
    ' ',
    ' ',
    '\t',
    '\n',
    '\r',
    '\r\n',
    '\x0b',
    '\x0c',
    '\x1c',
    '\x1d',
    '\x1e',
    '\x1f',
    '\x85',
    '\xa0',
    ' ',
    ' ',
    ' ',
    '​',
    ' ',
    ' ',
    ' ',
    ' ',
    '　',
    ',',
    '.',
    '-',
    '_',
    "'",
    '"',
    '\\',
    '\x00',
    '\x7f',
    'é',
    'É',
    'ß',
    'ẞ',
    'Σ',
    'σ',
    'ς',
    'İ',
    'ı',
    'ǅ',
    'ǆ',
    'Ǆ',
    'ﬁ',
    'ŉ',
    'ǰ',
    'ᾳ',
    'ᾼ',
    'µ',
    'Ω',
    'Ж',
    'ж',
    'ǈ',
    '一',
    '二',
    '万',
    '中',
    'ア',
    '٣',
    '߁',
    '२',
    '²',
    '½',
    'Ⅻ',
    '①',
    '́',
    'ͅ',
    '😀',
    '👍🏽',
    '𝟘',
    '𐐀',
    '𐐨',
    'Ꭰ',
    'ꭰ',
    'ჰ',
    'Ა',
]
const randomString = (maxLength = 12, alphabet = ALPHABET) =>
    Array.from({length: r.int(0, maxLength)}, () => r.pick(alphabet)).join('')

// ---------------------------------------------------------------------------
// strip
// ---------------------------------------------------------------------------
const stripSamples = [
    '',
    '   ',
    '  hi  ',
    '\t\n hi \x0b\x0c\r',
    '\x1c\x1d\x1e\x1fx\x85\xa0',
    '　中　',
    '​x​',
    'xxhixx',
    '😀a😀',
    'abcba',
    ' a ',
]
for (const s of stripSamples) {
    for (const fn of ['strip', 'lstrip', 'rstrip']) {
        method(fn, s)
        for (const chars of [null, '', 'x', 'ab', '😀', ' \t', 'a😀b']) {
            method(fn, s, chars)
        }
    }
}
pair('strip(5)', 'str.strip(5)')
pair("strip('a', 5)", "'a'.strip(5)")
for (let i = 0; i < 150; i++) {
    const s = randomString(14)
    const fn = r.pick(['strip', 'lstrip', 'rstrip'])
    method(fn, s)
    method(fn, s, randomString(3))
}

// ---------------------------------------------------------------------------
// split / rsplit
// ---------------------------------------------------------------------------
const splitSamples = [
    '',
    ' ',
    'a',
    'a b  c',
    '  a  b  c  ',
    'a,b,,c,',
    ',a,',
    'a\tb\nc\rd\x0be\x0cf\x1cg\x85h\xa0i　j',
    '1<>2<>3',
    'aaa',
    'aaaa',
    '😀,😀,😀',
    'a​b',
    ' x ',
]
for (const s of splitSamples) {
    for (const fn of ['split', 'rsplit']) {
        for (const sep of [null, ',', ' ', '<>', 'aa', 'a', '😀']) {
            for (const n of [-1, -5, 0, 1, 2, 5]) {
                method(fn, s, sep, n)
            }
        }
        method(fn, s)
    }
}
pair("split('a', '')", "'a'.split('')")
pair("rsplit('a', '')", "'a'.rsplit('')")
pair("split('a b', 1)", "'a b'.split(1)")
pair("split('a b', null, 1.5)", "'a b'.split(None, 1.5)")
pair("split('a b', null, null)", "'a b'.split(None, None)")
pair("split('a b', null, true)", "'a b'.split(None, True)")
pair('split(null)', 'str.split(None)')
for (let i = 0; i < 300; i++) {
    const s = randomString(16)
    const fn = r.pick(['split', 'rsplit'])
    const sep = r.pick([null, null, ' ', ',', 'a', ', ', 'ab', '\n', '😀', randomString(2)])
    const n = r.pick([-1, -1, 0, 1, 2, 3, r.int(-3, 8)])
    if (sep === '') {
        continue
    }
    method(fn, s, sep, n)
}

// ---------------------------------------------------------------------------
// splitlines
// ---------------------------------------------------------------------------
const lineSamples = [
    '',
    '\n',
    'a',
    'a\n',
    'a\nb',
    'a\r\nb',
    'a\r\rb',
    '\r\n\r\n',
    'a\n\nb\n',
    'a\x0bb\x0cc\x1cd\x1de\x1ef\x85g h i',
    'a\x1fb',
    'a\xa0b',
    'x\r',
    '\n\r',
]
for (const s of lineSamples) {
    method('splitlines', s)
    method('splitlines', s, true)
}
for (let i = 0; i < 100; i++) {
    const s = randomString(16)
    method('splitlines', s, r.next() < 0.5)
}

// ---------------------------------------------------------------------------
// join / partition
// ---------------------------------------------------------------------------
for (const [sep, items] of [
    ['', []],
    [', ', ['a']],
    [', ', ['a', 'b', 'c']],
    ['', ['😀', 'é']],
    ['-', ['', '', '']],
    ['😀', ['a', 'b']],
]) {
    pair(`join(${js(sep)}, ${js(items)})`, `${py(sep)}.join(${py(items)})`)
}
pair("join('-', 'abc')", "'-'.join('abc')")
pair("join('-', '😀é')", "'-'.join('😀é')")
pair("join(',', ['a', 1])", "','.join(['a', 1])")
pair("join(',', [1])", "','.join([1])")
pair("join(',', [null])", "','.join([None])")
pair("join(',', 5)", "','.join(5)")
pair("join(',', {a: 1, b: 2})", "','.join({'a': 1, 'b': 2})")
pair("join(5, ['a'])", "str.join(5, ['a'])")
for (const s of ['', 'abc', 'a,b,c', ',', 'a,,b', '😀,😀', 'no sep here']) {
    for (const sep of [',', ',,', 'a', '😀', 'xyz']) {
        method('partition', s, sep)
        method('rpartition', s, sep)
    }
}
pair("partition('a', '')", "'a'.partition('')")
pair("rpartition('a', '')", "'a'.rpartition('')")
pair("partition('a', null)", "'a'.partition(None)")
for (let i = 0; i < 100; i++) {
    const s = randomString(10, ['a', 'b', ',', ' ', '😀', 'é'])
    const sep = randomString(2, ['a', 'b', ',', ' ', '😀']) || 'a'
    method(r.pick(['partition', 'rpartition']), s, sep)
}

// ---------------------------------------------------------------------------
// startswith / endswith / find / rfind
// ---------------------------------------------------------------------------
const idx = [null, 0, 1, 2, 3, 5, 10, -1, -2, -3, -10]
for (const s of ['', 'abc', 'abcabc', '😀a😀b', 'héllo']) {
    for (const sub of ['', 'a', 'b', 'c', 'abc', 'ca', '😀', '😀b', 'llo', 'x']) {
        for (const fn of ['startswith', 'endswith', 'find', 'rfind']) {
            method(fn, s, sub)
            for (let k = 0; k < 4; k++) {
                const start = r.pick(idx)
                const end = r.pick(idx)
                method(fn, s, sub, start, end)
            }
        }
    }
}
for (const fn of ['startswith', 'endswith']) {
    pair(`${fn}('abc', ['x', 'a', 'c'])`, `'abc'.${fn}(('x', 'a', 'c'))`)
    pair(`${fn}('abc', [])`, `'abc'.${fn}(())`)
    pair(`${fn}('abc', ['', 'x'], 4)`, `'abc'.${fn}(('', 'x'), 4)`)
    pair(`${fn}('abc', ['', 'x'], 3)`, `'abc'.${fn}(('', 'x'), 3)`)
    pair(`${fn}('a😀b', ['😀b', 'x'], 1)`, `'a😀b'.${fn}(('😀b', 'x'), 1)`)
    method(fn, 'abc', '', 3)
    method(fn, 'abc', '', 4)
    method(fn, '', '', 0)
    method(fn, '', '', 1)
    pair(`${fn}('abc', 5)`, `'abc'.${fn}(5)`)
    pair(`${fn}('abc', ['a', 5])`, `'abc'.${fn}(('a', 5))`)
    pair(`${fn}('abc', 'a', 1.5)`, `'abc'.${fn}('a', 1.5)`)
}
pair("find('abc', 5)", "'abc'.find(5)")
method('find', 'abc', '', 3)
method('find', 'abc', '', 4)
method('rfind', 'abc', '', 4)
method('rfind', 'abc', '', 1, 2)
method('rindex', 'abcb', 'b')
method('rindex', 'abcb', 'x')
method('rindex', '😀b😀b', 'b', 0, 3)
for (let i = 0; i < 300; i++) {
    const s = randomString(10, ['a', 'b', 'c', '😀', 'é', ' '])
    const sub = randomString(2, ['a', 'b', 'c', '😀', 'é', ' '])
    const fn = r.pick(['startswith', 'endswith', 'find', 'rfind'])
    method(fn, s, sub, r.pick(idx), r.pick(idx))
}

// ---------------------------------------------------------------------------
// removeprefix / removesuffix / replace
// ---------------------------------------------------------------------------
for (const s of ['', 'abc', 'aaa', '😀😀', 'abab']) {
    for (const a of ['', 'a', 'ab', 'abc', 'abcd', '😀', 'b']) {
        method('removeprefix', s, a)
        method('removesuffix', s, a)
    }
}
pair("removeprefix('a', null)", "'a'.removeprefix(None)")
for (const s of ['', 'a', 'abc', 'aaaa', 'banana', '😀x😀']) {
    for (const [old, rep] of [
        ['', '-'],
        ['a', ''],
        ['a', 'XY'],
        ['aa', 'b'],
        ['an', '😀'],
        ['😀', ''],
        ['x', 'y'],
        ['', ''],
    ]) {
        method('replace', s, old, rep)
        for (const n of [0, 1, 2, 3, 10, -1, -3]) {
            method('replace', s, old, rep, n)
        }
    }
}
pair("replace('a', 1, 'b')", "'a'.replace(1, 'b')")
pair("replace('a', 'a', 1)", "'a'.replace('a', 1)")
pair("replace('a', 'a', 'b', 1.5)", "'a'.replace('a', 'b', 1.5)")
for (let i = 0; i < 200; i++) {
    const s = randomString(10, ['a', 'b', 'c', '😀', ' '])
    const old = randomString(2, ['a', 'b', '😀', ' '])
    const rep = randomString(2, ['x', '😀', ''])
    method('replace', s, old, rep, r.pick([-1, 0, 1, 2, r.int(-2, 6)]))
}

// ---------------------------------------------------------------------------
// zfill / center / ljust / rjust / expandtabs
// ---------------------------------------------------------------------------
for (const s of ['', '42', '-42', '+42', '-', '+', 'abc', '😀', '--1', ' -1', 'é']) {
    for (const w of [-1, 0, 1, 2, 3, 4, 5, 6, 7, 10]) {
        method('zfill', s, w)
    }
}
for (const s of ['', 'a', 'ab', 'abc', 'abcd', '😀', 'é😀']) {
    for (const w of [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
        for (const fn of ['center', 'ljust', 'rjust']) {
            method(fn, s, w)
            method(fn, s, w, '*')
            method(fn, s, w, '😀')
        }
    }
}
for (const fn of ['center', 'ljust', 'rjust']) {
    pair(`${fn}('a', 5, '')`, `'a'.${fn}(5, '')`)
    pair(`${fn}('a', 5, 'ab')`, `'a'.${fn}(5, 'ab')`)
    pair(`${fn}('a', 5, 1)`, `'a'.${fn}(5, 1)`)
    pair(`${fn}('a', 5.5)`, `'a'.${fn}(5.5)`)
    pair(`${fn}('a', '5')`, `'a'.${fn}('5')`)
}
pair("zfill('1', 2.5)", "'1'.zfill(2.5)")
for (let i = 0; i < 200; i++) {
    const s = randomString(6)
    const fn = r.pick(['center', 'ljust', 'rjust', 'zfill'])
    const w = r.int(-1, 14)
    if (fn === 'zfill') {
        method(fn, r.pick(['-', '+', '']) + s, w)
    } else {
        method(fn, s, w, r.pick([' ', '*', '0', 'é', '😀', '\t']))
    }
}
for (const s of ['', '\t', 'a\tb', 'ab\tc\td', '\t\t', 'abcdefgh\ti', 'a\nb\tc', 'ab\r\tc', '😀\tx', 'a\x0bb\tc', 'a \tb']) {
    for (const t of [undefined, -1, 0, 1, 2, 3, 4, 8]) {
        if (t === undefined) {
            method('expandtabs', s)
        } else {
            method('expandtabs', s, t)
        }
    }
}
for (let i = 0; i < 80; i++) {
    method('expandtabs', randomString(14, ['a', 'b', '\t', '\t', '\n', '\r', '😀', ' ']), r.int(-1, 9))
}

// ---------------------------------------------------------------------------
// case conversions
// ---------------------------------------------------------------------------
const caseSamples = [
    '',
    'hello world',
    'HELLO WORLD',
    "they're bill's friends",
    'hello-world_foo bar9baz',
    'ΣΑΣ ΣΑΣ',
    'ΣΑΣ.',
    'aΣ',
    'Σ',
    'aΣb',
    'aΣ́',
    'Σ́',
    'a.Σ',
    'ǆungla ǆ',
    'ǅ ǅǅ',
    'ßtraße',
    'ﬁnance ﬂow',
    'ŉ',
    'ǰ',
    'ᾳ ᾼ ᾀ',
    'İstanbul',
    'ıi',
    'ﬃ',
    'µ',
    'ẞ',
    'Ꭰꭰ',
    'ჰ Ა',
    '𐐀𐐨',
    'aBc DeF',
    '1st 2nd',
    'ǈ',
    'ΆΣ',
    'ΌΣΟΣ ΟΣ',
    'xͅ',
]
for (const s of caseSamples) {
    for (const fn of ['title', 'capitalize', 'swapcase', 'casefold', 'lower', 'upper']) {
        method(fn, s)
    }
}
for (let i = 0; i < 300; i++) {
    const s = randomString(10)
    method(r.pick(['title', 'capitalize', 'swapcase', 'casefold', 'lower', 'upper']), s)
}
// Every character on its own, skipping surrogates and the characters that
// Unicode 16 (which V8 knows) added or changed since CPython 3.13's Unicode 15.1.
const UNICODE_16 = [
    [0x19b, 0x19b],
    [0x264, 0x264],
    [2199, 2199],
    [6990, 6991],
    [7039, 7039],
    [7305, 7306],
    [9255, 9257],
    [12772, 12773],
    [42955, 42957],
    [42970, 42972],
    [67008, 67059],
    [68928, 68965],
    [68969, 68997],
    [69006, 69007],
    [69314, 69316],
    [69372, 69372],
    [70528, 70537],
    [70539, 70539],
    [70542, 70542],
    [70544, 70581],
    [70583, 70592],
    [70594, 70594],
    [70597, 70597],
    [70599, 70602],
    [70604, 70613],
    [70615, 70616],
    [70625, 70626],
    [71376, 71395],
    [72640, 72673],
    [72688, 72697],
    [73562, 73562],
    [78944, 82938],
    [90368, 90425],
    [93504, 93561],
    [101631, 101631],
    [117760, 118009],
    [118016, 118451],
    [124368, 124410],
    [124415, 124415],
    [129202, 129211],
    [129216, 129217],
    [129673, 129673],
    [129679, 129679],
    [129726, 129726],
    [129734, 129734],
    [129756, 129756],
    [129759, 129759],
    [129769, 129769],
    [129995, 130031],
]
const skip = JSON.stringify(UNICODE_16)
for (const [lo, hi] of [
    [0, 0x10000],
    [0x10000, 0x20000],
    [0x20000, 0x110000],
]) {
    const jsChars = `const skip = new Set(); for (const [a, b] of ${skip}) { for (let i = a; i <= b; i++) skip.add(i) }
        const out = []; for (let i = ${lo}; i < ${hi}; i++) { if ((i < 0xd800 || i >= 0xe000) && !skip.has(i)) out.push(String.fromCodePoint(i)) }`
    const pyChars = `skip = set().union(*[range(a, b + 1) for a, b in ${skip}])\nchars = [chr(i) for i in range(${lo}, ${hi}) if not (0xd800 <= i < 0xe000) and i not in skip]`
    const fns =
        lo === 0
            ? [
                  'title',
                  'capitalize',
                  'swapcase',
                  'casefold',
                  'lower',
                  'upper',
                  'isdigit',
                  'isdecimal',
                  'isnumeric',
                  'isalpha',
                  'isalnum',
                  'isspace',
                  'isupper',
                  'islower',
                  'istitle',
                  'isidentifier',
                  'isascii',
              ]
            : ['title', 'casefold', 'upper', 'lower', 'isdigit', 'isnumeric', 'isalpha', 'isupper', 'isidentifier']
    for (const fn of fns) {
        pair(`${jsChars}\n return out.map((c) => ${fn}(c))`, `${pyChars}\nresult = [c.${fn}() for c in chars]`)
    }
}

// ---------------------------------------------------------------------------
// predicates
// ---------------------------------------------------------------------------
const predicateSamples = [
    '',
    'abc',
    'ABC',
    'Abc',
    'aBC',
    'Hello World',
    'Hello world',
    'HELLO',
    'hello 1',
    '123',
    '١٢٣',
    '²',
    '½',
    'Ⅻ',
    '一二三',
    '①',
    '12a',
    ' ',
    '\t\n',
    '\x1c',
    '\x1f',
    '​',
    '\xa0',
    'abc_1',
    '_',
    '1abc',
    'é',
    'ǅ',
    'ǅa',
    'Ǆa',
    'ǆ',
    'a ǅ',
    'This Is',
    'This is',
    "They'Re",
    'A1B',
    'a1b',
    '1',
    'ß',
    'ΣΑΣ',
    'Σας',
    '́',
    'á',
    'Ab Cd',
    'AB CD',
    '😀',
    'a😀',
    'if',
    'None',
    'x̀',
    '\x7f',
    '\x80',
    '𝟘',
    'ℕ',
    'Ⅰ',
    'ⅰ',
    'ª',
    'ʰ',
    'Ⅰb',
    'Ⓐ',
    'ⓐ',
]
for (const s of predicateSamples) {
    for (const fn of [
        'isdigit',
        'isdecimal',
        'isnumeric',
        'isalpha',
        'isalnum',
        'isspace',
        'isupper',
        'islower',
        'istitle',
        'isidentifier',
        'isascii',
    ]) {
        method(fn, s)
    }
}
for (let i = 0; i < 300; i++) {
    const s = randomString(5)
    method(
        r.pick([
            'isdigit',
            'isdecimal',
            'isnumeric',
            'isalpha',
            'isalnum',
            'isspace',
            'isupper',
            'islower',
            'istitle',
            'isidentifier',
            'isascii',
        ]),
        s,
    )
}
pair('isdigit(5)', 'str.isdigit(5)')
pair('isupper(null)', 'str.isupper(None)')

// error messages, not just exception types
const message = (jsExpr, pyExpr) =>
    pair(
        `try { ${jsExpr}; return 'no error' } catch (e) { return [e.name, e.message] }`,
        `try:\n    ${pyExpr}\n    result = 'no error'\nexcept Exception as e:\n    result = [type(e).__name__, str(e)]`,
    )
for (const [jsExpr, pyExpr] of [
    ["split('a', '')", "'a'.split('')"],
    ["rsplit('a', 1)", "'a'.rsplit(1)"],
    ["partition('a', '')", "'a'.partition('')"],
    ["rpartition('a', 5)", "'a'.rpartition(5)"],
    ["center('a', 5, 'ab')", "'a'.center(5, 'ab')"],
    ["ljust('a', 5, 5)", "'a'.ljust(5, 5)"],
    ["startswith('a', 5)", "'a'.startswith(5)"],
    ["endswith('a', ['a', 5])", "'a'.endswith(('a', 5))"],
    ["find('a', 5)", "'a'.find(5)"],
    ["rindex('a', 'b')", "'a'.rindex('b')"],
    ["replace('a', 'a', 5)", "'a'.replace('a', 5)"],
    ["strip('a', 5)", "'a'.strip(5)"],
    ["join(',', [1])", "','.join([1])"],
    ["join(',', ['a', 'b', null])", "','.join(['a', 'b', None])"],
    ["zfill('a', 1.5)", "'a'.zfill(1.5)"],
    ["removeprefix('a', 5)", "'a'.removeprefix(5)"],
    ["startswith('a', 'a', 1.5)", "'a'.startswith('a', 1.5)"],
]) {
    message(jsExpr, pyExpr)
}

export default cases
