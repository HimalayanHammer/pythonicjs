// repr(), ascii(), format() with the format-spec mini-language, and str.format().
import {js, py, rng} from './harness.mjs'

const cases = []
const pair = (jsCode, pyCode) => cases.push({js: jsCode, py: pyCode})
// JS numbers that are integral are Python ints, so spell them as exact ints for CPython
const pyNum = (v) => (typeof v === 'number' && Number.isInteger(v) ? BigInt(v).toString() : py(v))
const fmt = (value, spec) => pair(`format(${js(value)}, ${js(spec)})`, `format(${pyNum(value)}, ${py(spec)})`)

const r = rng(31337)

// ---------------------------------------------------------------------------
// repr / ascii
// ---------------------------------------------------------------------------
const reprStrings = ['', 'abc', "it's", '"quoted"', `both ' and "`, 'back\\slash', 'tab\tnew\nline\rret', '\x00\x01\x1f\x7f', '\x80\x9f\xa0\xad',
    'é ß Σ', '中文', '😀', '​‎  ', '﻿', '', '́', '　', '�￿', '\u{1F3FD}', '\u{E0001}',
    '\u{10FFFF}', 'ǅ', '͸', '\u{1D11E}']
for (const s of reprStrings) {
    pair(`repr(${js(s)})`, `repr(${py(s)})`)
    pair(`ascii(${js(s)})`, `ascii(${py(s)})`)
}
for (const v of [0, 1, -1, 1.5, -0.25, 1e16, 1e-5, 0.1, 123456789012, 2 ** 53, null, true, false, [], [1, 'a', null], {}, {a: 1, 'b c': [true]},
    [[1.5, 'é']], 'x']) {
    pair(`repr(${js(v)})`, `repr(${py(v)})`)
    pair(`ascii(${js(v)})`, `ascii(${py(v)})`)
}
pair('repr(NaN)', "repr(float('nan'))")
pair('repr(-Infinity)', "repr(float('-inf'))")
pair('repr(12345678901234567890n)', 'repr(12345678901234567890)')
pair('repr(new Set())', 'repr(set())')
pair("repr(new Map([[1, 'a']]))", "repr({1: 'a'})")
for (let i = 0; i < 100; i++) {
    const s = Array.from({length: r.int(0, 8)}, () => String.fromCodePoint(r.pick([r.int(0, 0x7f), r.int(0x80, 0x2ff), r.int(0x2000, 0x206f),
        r.int(0xe000, 0xe0ff), r.int(0x1f300, 0x1f6ff), r.int(0xfff0, 0xffff), r.int(0x0, 0x20)]))).join('')
    pair(`repr(${js(s)})`, `repr(${py(s)})`)
    pair(`ascii(${js(s)})`, `ascii(${py(s)})`)
}

// ---------------------------------------------------------------------------
// format(): hand-picked edge cases
// ---------------------------------------------------------------------------
const intSpecs = ['', 'd', 'b', 'o', 'x', 'X', 'c', 'n', '#b', '#o', '#x', '#X', '+d', ' d', '-d', '08', '08d', '+08d', '#010x', '#010X',
    '0=+8', '*^9', '*<9', '*>9', '*=9', '=9', '^', '<', ',', '_', ',d', '_d', '_b', '_x', '_o', '_X', '#_b', '012,', '012_',
    '09,', '08,', '07,', '015,d', '010_x', '#012_b', '0<8', '0>8', '0^8', 'x<08', '😀>5', '{^5', 'e', 'E', 'f', 'F', 'g', 'G', '%',
    '.2f', '.0e', ',.2f', '_.3e', '.3', '.2d', 'z', 'zd', 'z.2f', '#c', '+c', ',c', '_c', ',n', '_n', 's', ' x', '+#x', ',b',
    '10', '<10', '^10', '>10', '=10', '+^10', '-^10', ' ^10', '0', '00', '000', '0010', '١٠', '.2%', '#.0f', '#.0e', '#g']
const ints = [0, 1, -1, 7, -7, 42, 65, 255, -255, 1000, -1000, 123456789, -123456789, 2 ** 31, 2 ** 53, 0x10ffff, 0x110000]
for (const n of ints) {
    for (const spec of intSpecs) {
        fmt(n, spec)
    }
}
for (const n of [10n ** 30n, -(10n ** 30n), 2n ** 64n - 1n, 10n ** 400n]) {
    for (const spec of ['', 'd', ',', '_', 'x', '#X', 'b', '_o', '+,', ' ^50,', 'e', '.3e', 'g', 'f', ',.2f', '%', 'c', '0=60,']) {
        fmt(n, spec)
    }
}
pair('format(1e21, ",")', 'format(10**21, ",")')
pair('format(2 ** 60, "_x")', 'format(2 ** 60, "_x")')

const floatSpecs = ['', 'e', 'E', 'f', 'F', 'g', 'G', 'n', '%', '.0', '.1', '.3', '.10', '.17', '.0e', '.1e', '.10e', '.0f', '.1f', '.2f',
    '.20f', '.0g', '.1g', '.2g', '.6g', '.15g', '.17g', '.20g', '#', '#.0', '#.3', '#e', '#.0e', '#f', '#.0f', '#g', '#.0g', '#.3g',
    '#G', '#%', '#.0%', '+', ' ', '+e', ' f', '+.2f', '-g', 'z', 'z.1f', 'z.0f', 'z.2e', 'zg', 'z.3g', 'z%', '+z.1f', ' z.1f',
    ',', '_', ',.2f', '_.2f', ',e', ',g', '_g', ',%', ',.0f', '015', '015.2f', '015,.2f', '015_.3f', '+015,.2f', '0=12.3f',
    '*^15', '*<15', '*>15', '*=15', '^15.3e', '<12', '>12g', '=+12', '012', '020,', '020,.1f', '0<12', 'x>12', '😀^9.2f',
    '.2', '.2n', 'n', '010n', '.3%', '10.4%', 'd', 'b', 'x', 'c', 's', 'r', '.1d', '12.5', '015.5g', '#015.0f', '0=015.1f']
const floats = [0.5, 1.5, 2.5, -0.5, -1.5, 0.125, 0.375, 1.005, 2.675, 0.1, 0.2, 1 / 3, 2 / 3, -2 / 3, 123.456, -123.456, 1e-7, 1.5e-5,
    9.999999e-5, 0.0001, 0.00012345, 1234.5678, 99999.5, 999999.5, 1e16 + 0.5, 1.5e16, 1.2345e20, 1e100 + 1e84, 1.7976931348623157e308,
    5e-324, 2.2250738585072014e-308, 0.999999, 0.9999999, 9.5, 0.05, 0.25, 0.75, 3.14159, -0.001, -0.0004, -1e-20, 314.15,
    NaN, Infinity, -Infinity]
for (const x of floats) {
    for (const spec of floatSpecs) {
        fmt(x, spec)
    }
}

// bools, None, strings and other objects
for (const v of [true, false]) {
    for (const spec of ['', 'd', 'x', '>5', '^7', '05', '.2f', 'e', '%', 's', 'c', '+', ',', '#b', 'z']) {
        fmt(v, spec)
    }
}
for (const spec of ['', 's', '>5', 'd']) {
    fmt(null, spec)
}
const strSpecs = ['', 's', '5', '>5', '<5', '^5', '^6', '*^6', '*^7', '.0', '.1', '.2', '.10', '5.2', '>5.2s', '^10.3', '0', '05', '010s', '0^5',
    '0<5', '0>5', '=5', '0=5', '+', '-', ' ', '+s', 'z', '#', '#s', ',', '_', ',s', 'd', 'x', 'r', 'S', '😀<5', 'é^7', '\t>4', '{>4',
    '}<4', '.', '.s', '5.', 'ss', '>>5', '<<5', 'x<', '<', '　^9', '1_0', '1,0', '..2', '.2.2', '١٢', '.٢']
for (const s of ['', 'a', 'abc', 'hello world', '😀😀', 'é', 'a😀b']) {
    for (const spec of strSpecs) {
        fmt(s, spec)
    }
}
pair('format([1, 2])', 'format([1, 2])')
pair("format([1, 'a'], '')", "format([1, 'a'], '')")
pair("format([1, 2], '>10')", "format([1, 2], '>10')")
pair("format({a: 1}, '')", "format({'a': 1}, '')")
pair("format({a: 1}, 's')", "format({'a': 1}, 's')")
pair('format(1, 5)', 'format(1, 5)')
pair("format('a', null)", "format('a', None)")

// ---------------------------------------------------------------------------
// format(): random specs built from the grammar
// [[fill]align][sign][z][#][0][width][grouping][.precision][type]
// ---------------------------------------------------------------------------
const FILLS = ['', '', '', '*', '0', ' ', 'x', '😀', 'é', '{', '}', '<', '=', '_', ',', '.', '%']
function randomSpec(types, {validOnly = false} = {}) {
    let spec = ''
    if (r.next() < 0.5) {
        spec += r.pick(FILLS) + r.pick(['<', '>', '^', '='])
    }
    if (r.next() < 0.35) {
        spec += r.pick(['+', '-', ' '])
    }
    if (r.next() < (validOnly ? 0 : 0.1)) {
        spec += 'z'
    }
    if (r.next() < 0.25) {
        spec += '#'
    }
    if (r.next() < 0.25) {
        spec += '0'
    }
    if (r.next() < 0.6) {
        spec += String(r.int(0, 25))
    }
    if (r.next() < 0.3) {
        spec += r.pick([',', '_'])
    }
    if (r.next() < 0.4) {
        spec += `.${r.int(0, 20)}`
    }
    if (r.next() < 0.85) {
        spec += r.pick(types)
    }
    return spec
}
const INT_TYPES = ['b', 'c', 'd', 'o', 'x', 'X', 'n', 'e', 'E', 'f', 'F', 'g', 'G', '%', '', '', 'd', 'd']
const FLOAT_TYPES = ['e', 'E', 'f', 'F', 'g', 'G', 'n', '%', '', '', 'f', 'f', 'g']
const randomInt = () =>
    r.pick([r.int(-10, 10), r.int(-1000, 1000), r.int(-1e6, 1e6), r.int(-(2 ** 40), 2 ** 40), r.int(0, 0x10ffff), r.int(-(2 ** 52), 2 ** 52)])
const randomFloat = () => {
    const kind = r.int(0, 6)
    if (kind === 0) {
        return r.int(-100000, 100000) / 8 + (r.next() < 0.5 ? 0.5 : 0.125)
    }
    if (kind === 1) {
        return (r.next() - 0.5) * 10 ** r.int(-12, 25)
    }
    if (kind === 2) {
        return r.int(-99999, 99999) / 1000 + 0.0005
    }
    if (kind === 3) {
        return (r.next() - 0.5) * 10 ** r.int(-320, 308)
    }
    if (kind === 4) {
        return r.int(1, 999) / 10 ** r.int(1, 6) + 0.5 / 10 ** r.int(1, 8)
    }
    return (r.next() - 0.5) * 2
}
for (let i = 0; i < 1500; i++) {
    const n = randomInt()
    fmt(n, randomSpec(INT_TYPES, {validOnly: i % 2 === 0}))
}
for (let i = 0; i < 2500; i++) {
    let x = randomFloat()
    if (Number.isInteger(x)) {
        x += 0.5
    }
    fmt(x, randomSpec(FLOAT_TYPES, {validOnly: i % 2 === 0}))
}
for (let i = 0; i < 300; i++) {
    const n = BigInt(randomInt()) * 10n ** BigInt(r.int(0, 40))
    fmt(n, randomSpec(INT_TYPES))
}
const STR_TYPES = ['s', '', '', 's', 'd', 'r']
for (let i = 0; i < 600; i++) {
    const s = Array.from({length: r.int(0, 8)}, () => r.pick(['a', 'b', ' ', 'é', '😀', '中', '\t'])).join('')
    fmt(s, randomSpec(STR_TYPES))
}
// arbitrary junk specs: the error type must match too
const JUNK = ['<', '>', '^', '=', '+', '-', ' ', 'z', '#', '0', '1', '9', ',', '_', '.', 'd', 'f', 'x', 's', 'e', '%', 'a', '😀', '{']
for (let i = 0; i < 600; i++) {
    const spec = Array.from({length: r.int(1, 7)}, () => r.pick(JUNK)).join('')
    fmt(r.pick([5, -12345, 0.5, -2.25, 'text', true, 1e-9]), spec)
}

// ---------------------------------------------------------------------------
// str.format
// ---------------------------------------------------------------------------
/** str_format(template, ...args, kwargs) against template.format(*args, **kwargs). */
const sf = (template, args = [], kwargs = null) => {
    const jsArgs = [template, ...args].map(js)
    const last = args[args.length - 1]
    if (kwargs) {
        jsArgs.push(js(kwargs))
    } else if (last !== null && typeof last === 'object' && !Array.isArray(last)) {
        // a trailing plain object would be taken as kwargs: pass empty kwargs explicitly
        jsArgs.push('{}')
    }
    const pyArgs = args.map(py)
    if (kwargs) {
        pyArgs.push(...Object.entries(kwargs).map(([k, v]) => `${k}=${py(v)}`))
    }
    pair(`str_format(${jsArgs.join(', ')})`, `${py(template)}.format(${pyArgs.join(', ')})`)
}
sf('')
sf('plain text')
sf('{}', [1])
sf('{} {}', [1, 'a'])
sf('{0} {1} {0}', ['a', 'b'])
sf('{1}{0}', ['a', 'b'])
sf('{}', [])
sf('{1}', ['a'])
sf('{0}{}', ['a', 'b'])
sf('{}{0}', ['a', 'b'])
sf('{name}', [], {name: 'Ann'})
sf('{name} is {age}', [], {name: 'Ann', age: 30})
sf('{0} {name} {}', ['a', 'b'], {name: 'n'})
sf('{} {name} {}', ['a', 'b'], {name: 'n'})
sf('{missing}', [], {name: 'n'})
sf('{missing}')
sf('{{}}')
sf('{{{}}}', [5])
sf('{{0}}', [5])
sf('}}{{')
sf('}')
sf('{')
sf('a}b')
sf('a{b', [], {b: 1})
sf('{0!r}', ['é'])
sf('{0!s}', ['x'])
sf('{0!a}', ['é😀'])
sf('{!r:>10}', ['x'])
sf('{0!x}', ['x'])
sf('{0!}', ['x'])
sf('{0!r', ['x'])
sf('{0!rr}', ['x'])
sf('{0!r:}', ['x'])
sf('{0:}', ['x'])
sf('{0', ['x'])
sf('{0:', ['x'])
sf('{0:>{1}', ['x', 5])
sf('{:{}}', ['x', 5])
sf('{:{}{}}', ['x', '>', 5])
sf('{:{}.{}f}', [3.14159, 10, 2])
sf('{0:{1}.{2}f}', [3.14159, 10, 2])
sf('{0:{width}.{prec}f}', [3.14159], {width: 10, prec: 3})
sf('{:{:{}}}', [1, 2, 3])
sf('{:{}}{}', ['a', 5, 'b'])
sf('{:{0}}', ['a', 5])
sf('{0[0]}', [[10, 20]])
sf('{0[1]}', [[10, 20]])
sf('{0[2]}', [[10, 20]])
sf('{0[1][0]}', [[1, [2, 3]]])
sf('{0[a]}', [{a: 1}])
sf('{0[b]}', [{a: 1}])
sf('{0[a]}', [[1]])
sf('{0[]}', [[1]])
sf('{0[0}', [[1]])
sf('{0[0]x}', [[1]])
sf('{0.}', [[1]])
sf('{0[1]}', ['abc'])
sf('{0[5]}', ['abc'])
sf('{0[a]}', ['abc'])
sf('{0[0]}', [5])
sf('{d[key]}', [], {d: {key: 'v'}})
sf('{d[key]:>5}', [], {d: {key: 'v'}})
pair("str_format('{d[0]}', {d: new Map([[0, 'zero']])})", "'{d[0]}'.format(d={0: 'zero'})")
sf('{d[x y]}', [], {d: {'x y': 1}})
sf('{d[a:b]}', [], {d: {'a:b': 1}})
sf('{d[a!b]}', [], {d: {'a!b': 1}})
sf('{0[{]}', [[1]])
sf('{0:d}', ['x'])
sf('{0:,}', ['x'])
sf('{0:,}', [1234567])
sf('{:_b}', [255])
sf('{:%}', [0.5])
sf('{:.2%}', [0.12345])
sf('{:>8.3f}|{:<8}|{:^8}', [3.14159, 'ab', 'cd'])
sf('{:*^10}', ['mid'])
sf('{:#x} {:#o} {:#b}', [255, 8, 5])
sf('{0:{fill}{align}{width}}', ['x'], {fill: '*', align: '^', width: 9})
sf('{!s:{}}', ['ab', 5])
sf('{00}', ['a'])
sf('{01}', ['a', 'b'])
sf('{٠}', ['arabic zero'])
sf('{99999999999999999999}', ['a'])
sf('{-1}', ['a'])
sf('{ 0}', ['a'])
sf('{0 }', ['a'])
sf('{a b}', [], {})
sf('{0}{1}{2}{3}{4}{5}{6}{7}{8}{9}{10}', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'])
sf('😀{}😀{:😀^5}😀', ['x', 'y'])
sf('{:{}}', ['x', '>'])
sf('{} {}', [null, true])
sf('{:d} {:>3}', [true, false])
sf('{}', [[1, 'two', null]])
sf('{!r}', [[1, 'two', null]])
sf('{:>10}', [[1]])
sf('{}', [1.0e-7])
sf('{}', [0.1])
sf('{}', [1.2345e-100])
sf('{}', [-1.5e-300])
sf('{0:}{0:>3}', [12])
sf('{:{{}}}', [1])
sf('{0:{1:{2}}}', [1, 2, 3])
sf('{0:}}', [1])
sf('{0}}', [1])
sf('{{{0}}}', [1])
sf('{0:{{}', [1])

// random templates mixing literal text, escapes and fields
const randomArgs = () => Array.from({length: r.int(0, 4)}, () => r.pick([r.int(-999, 999), 'str', 'é😀', 1.25, -0.5, true, null, [1, 'a']]))
for (let i = 0; i < 400; i++) {
    const args = randomArgs()
    const kwargs = r.next() < 0.4 ? {x: r.pick([1, 'kw', 2.5, [7]]), y: r.pick(['', 'yy', 33])} : null
    const auto = r.next() < 0.5
    let template = ''
    const parts = r.int(0, 5)
    for (let k = 0; k < parts; k++) {
        const kind = r.int(0, 9)
        if (kind <= 2) {
            template += r.pick(['a', ' ', 'text', '😀', '{{', '}}', ':', '!', '[', ']', '.', '-'])
        } else if (kind <= 6) {
            let field = auto ? '' : String(r.int(0, 4))
            if (r.next() < 0.2) {
                field = r.pick(['x', 'y', 'z'])
            }
            if (r.next() < 0.1) {
                field += r.pick(['[0]', '[1]', '[a]', '[0][0]'])
            }
            if (r.next() < 0.25) {
                field += `!${r.pick(['r', 's', 'a', 'r', 'q'])}`
            }
            if (r.next() < 0.5) {
                field += `:${r.pick(['', '>5', '<4', '^7', '*^6', 'd', '.2f', 's', ',', '05', '{}', '>{}', '{x}', '#x', 'e', '+', '%', '.1'])}`
            }
            template += `{${field}}`
        } else if (kind === 7) {
            template += r.pick(['{', '}', '{0', '{!', '{:', '{0[', '{0.}', '{]}'])
        } else {
            template += r.pick(['{}', '{0}', '{1}', '{x}'])
        }
    }
    sf(template, args, kwargs)
}

// error messages, not just exception types
const message = (jsExpr, pyExpr) =>
    pair(`try { ${jsExpr}; return 'no error' } catch (e) { return [e.name, e.message] }`,
        `try:\n    ${pyExpr}\n    result = 'no error'\nexcept Exception as e:\n    result = [type(e).__name__, str(e)]`)
const messageSpecs = [[5, 's'], [5, '.2d'], [5, 'z'], [5, '+c'], [5, '#c'], [5, ',c'], [5, ',s'], [5, '_n'], [5, ',_'], [5, '_,'],
    [5, '.'], [5, '5.'], [5, 'dd'], [5, '\x01'], [5, '😀'], [5, '😀😀'], [5, '1,,'], [-1, 'c'], [0x110000, 'c'], [1.5, 'd'], [1.5, 'x'],
    [1.5, ',x'], [1.5, '_b'], [1.5, '.f.'], ['s', 'd'], ['s', '+'], ['s', ' '], ['s', 'z'], ['s', '#'], ['s', '='], ['s', '0=5'],
    ['s', ','], ['s', '_'], ['s', ',d'], ['s', '.x'], [true, 's'], [null, 'd'], [[1], 's'], [5, '99999999999999999999'],
    [1.5, '.99999999999999999999f'], [1.5, '.3000000000f']]
for (const [v, spec] of messageSpecs) {
    message(`format(${js(v)}, ${js(spec)})`, `format(${py(v)}, ${py(spec)})`)
}
message('format(10n ** 400n, "e")', 'format(10 ** 400, "e")')
for (const [t, args] of [['{', []], ['}', []], ['{0', [1]], ['{0!', [1]], ['{0!r', [1]], ['{0!rr}', [1]], ['{0!x}', [1]], ['{0:', [1]],
    ['{{}', []], ['{0[}', [[1]]], ['{0[0]x}', [[1]]], ['{0[]}', [[1]]], ['{0.}', [[1]]], ['{1}', [1]], ['{}', []], ['{}{0}', [1, 2]],
    ['{0}{}', [1, 2]], ['{a}', []], ['{:{:{}}}', [1, 2, 3]], ['{0[3]}', [[1]]], ['{0[3]}', ['ab']], ['{0[x]}', [[1]]], ['{0[x]}', ['ab']],
    ['{0[x]}', [5]], ['{0:d}', ['x']], ['{a[', []], ['{0!\x01}', [1]], ['{99999999999999999999}', [1]]]) {
    message(`str_format(${[t, ...args].map(js).join(', ')})`, `${py(t)}.format(${args.map(py).join(', ')})`)
}
message("str_format('{a}', {b: 1})", "'{a}'.format(b=1)")
message("format_map('{0}', {})", "'{0}'.format_map({})")
message("join(',', ['a', 1])", "','.join(['a', 1])")

// format_map
pair("format_map('{a} {b}', {a: 1, b: 'x'})", "'{a} {b}'.format_map({'a': 1, 'b': 'x'})")
pair("format_map('{a}', {})", "'{a}'.format_map({})")
pair("format_map('{0}', {})", "'{0}'.format_map({})")
pair("format_map('{}', {})", "'{}'.format_map({})")
pair("format_map('{a[0]:>4}', {a: [5]})", "'{a[0]:>4}'.format_map({'a': [5]})")

export default cases
