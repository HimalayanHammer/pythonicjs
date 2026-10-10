// JavaScript-facing behaviour of repr/ascii/format/str_format. Python parity
// itself is covered by test/cpython/format.cases.mjs.
import {expect} from 'chai'
import {ascii, format, format_map, IndexError, KeyError, repr, str_format, ValueError} from 'pythonicjs'

describe('format', () => {
    it('treats integral numbers and bigints as ints and other numbers as floats', () => {
        expect(format(3)).to.equal('3')
        expect(format(3.5)).to.equal('3.5')
        expect(format(-0)).to.equal('0')
        expect(format(2 ** 70, ',')).to.equal('1,180,591,620,717,411,303,424')
        expect(format(10n ** 20n, '_')).to.equal('100_000_000_000_000_000_000')
        expect(format(3, '.2f')).to.equal('3.00')
        expect(() => format(3, '.2')).to.throw(ValueError, 'Precision not allowed in integer format specifier')
        expect(format(3.25, '.2')).to.equal('3.2')
        expect(format(0.1 + 0.2)).to.equal('0.30000000000000004')
    })

    it('rounds half to even on the exact binary value, unlike toFixed()', () => {
        expect(format(2.675, '.2f')).to.equal('2.67')
        expect(format(0.125, '.2f')).to.equal('0.12')
        expect(format(0.375, '.2f')).to.equal('0.38')
        expect((0.125).toFixed(2)).to.equal('0.13')
        expect(format(1.5, '.0f')).to.equal('2')
        expect(format(2.5, '.0f')).to.equal('2')
    })

    it('formats booleans and null like Python', () => {
        expect(format(true)).to.equal('True')
        expect(format(true, 'd')).to.equal('1')
        expect(format(false, '>3')).to.equal('  0')
        expect(format(null)).to.equal('None')
        expect(format(undefined)).to.equal('None')
        expect(() => format(null, '>5')).to.throw(TypeError, 'unsupported format string passed to NoneType.__format__')
    })

    it('calls __format__ and falls back to repr for other objects', () => {
        const money = {__format__: (spec) => `$${spec || 'plain'}`}
        expect(format(money, '>10')).to.equal('$>10')
        expect(format(money)).to.equal('$plain')
        expect(format([1, 'a'])).to.equal("[1, 'a']")
        expect(format({__repr__: () => 'R()'})).to.equal('R()')
        expect(format({__str__: () => 'S', __repr__: () => 'R'})).to.equal('S')
        expect(() => format({__format__: () => 5}, '')).to.throw(TypeError, '__format__ must return a str, not int')
        expect(() => format([1], 'd')).to.throw(TypeError)
    })

    it('pads by code point and accepts any fill character', () => {
        expect(format('😀', '*^5')).to.equal('**😀**')
        expect(format('ab', '😀>4')).to.equal('😀😀ab')
        expect(format('héllo', '.2')).to.equal('hé')
    })

    it('rejects a non-string spec', () => {
        expect(() => format(1, 5)).to.throw(TypeError, 'format() argument 2 must be str, not int')
    })
})

describe('repr / ascii', () => {
    it('quotes and escapes like Python', () => {
        expect(repr("it's")).to.equal(`"it's"`)
        expect(repr('a\nb')).to.equal("'a\\nb'")
        expect(repr([1, 'x', null, true, 1.5])).to.equal("[1, 'x', None, True, 1.5]")
        expect(repr({a: [1]})).to.equal("{'a': [1]}")
        expect(repr(1e16)).to.equal('10000000000000000')
        expect(repr(1.5e-7)).to.equal('1.5e-07')
        expect(ascii('é😀')).to.equal("'\\xe9\\U0001f600'")
        expect(ascii(['ω'])).to.equal("['\\u03c9']")
    })
})

describe('str_format', () => {
    it('supports positional, keyword and nested fields', () => {
        expect(str_format('{} and {}', 'a', 'b')).to.equal('a and b')
        expect(str_format('{1}{0}', 'a', 'b')).to.equal('ba')
        expect(str_format('{name} is {age}', {name: 'Ann', age: 30})).to.equal('Ann is 30')
        expect(str_format('{0} {x}', 'pos', {x: 'kw'})).to.equal('pos kw')
        expect(str_format('{:{w}.{p}f}', Math.PI, {w: 8, p: 3})).to.equal('   3.142')
        expect(str_format('{{literal}} {}', 1)).to.equal('{literal} 1')
    })

    it('treats a trailing plain object as keyword arguments', () => {
        expect(() => str_format('{}', {a: 1})).to.throw(IndexError, 'Replacement index 0 out of range for positional args tuple')
        expect(str_format('{}', {a: 1}, {})).to.equal("{'a': 1}")
        expect(str_format('{0[a]}', {a: 1}, {})).to.equal('1')
    })

    it('looks up attributes and items on JavaScript values', () => {
        class Point {
            constructor(x, y) {
                this.x = x
                this.y = y
            }
        }
        expect(str_format('{0.x},{0.y}', new Point(1, 2))).to.equal('1,2')
        expect(str_format('{p.x}', {p: new Point(3, 4)})).to.equal('3')
        expect(str_format('{0[1]} {0[0]}', ['a', 'b'])).to.equal('b a')
        expect(str_format('{0[1]}', '😀x')).to.equal('x')
        expect(str_format('{0[k]}', new Map([['k', 'v']]))).to.equal('v')
        expect(str_format('{0[0]}', new Map([[0, 'zero']]))).to.equal('zero')
        expect(str_format('{d[0]}', {d: {0: 'zero'}})).to.equal('zero')
        expect(str_format('{0[k]}', {__getitem__: (k) => k.toUpperCase()}, {})).to.equal('K')
        expect(() => str_format('{0.nope}', new Point(1, 2))).to.throw(Error, "'Point' object has no attribute 'nope'")
    })

    it('applies conversions and __format__', () => {
        expect(str_format('{!r}', 'x')).to.equal("'x'")
        expect(str_format('{!a}', 'é')).to.equal("'\\xe9'")
        expect(str_format('{:>6}', {__format__: (spec) => `<${spec}>`}, {})).to.equal('<>6>')
    })

    it('raises the same errors as CPython', () => {
        expect(() => str_format('{', 1)).to.throw(ValueError, "Single '{' encountered in format string")
        expect(() => str_format('}', 1)).to.throw(ValueError, "Single '}' encountered in format string")
        expect(() => str_format('{}{0}', 1, 2)).to.throw(ValueError, 'cannot switch from automatic field numbering to manual field specification')
        expect(() => str_format('{x}', {y: 1})).to.throw(KeyError, "'x'")
        expect(() => str_format('{0!z}', 1)).to.throw(ValueError, 'Unknown conversion specifier z')
    })

    it('has format_map for mappings', () => {
        expect(format_map('{a}-{b}', {a: 1, b: 2})).to.equal('1-2')
        expect(format_map('{a}', new Map([['a', 'm']]))).to.equal('m')
        expect(() => format_map('{}', {})).to.throw(ValueError, 'Format string contains positional fields')
    })
})
