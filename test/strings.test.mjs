// JavaScript-facing behaviour of the str methods. Python parity itself is
// covered by test/cpython/strings.cases.mjs.
import {expect} from 'chai'
import {
    capitalize,
    casefold,
    center,
    endswith,
    expandtabs,
    find,
    isalpha,
    isdigit,
    isidentifier,
    isnumeric,
    isspace,
    join,
    ljust,
    partition,
    replace,
    rfind,
    rindex,
    rjust,
    rsplit,
    split,
    splitlines,
    startswith,
    strip,
    swapcase,
    title,
    ValueError,
    zfill,
} from 'pythonicjs'

describe('strings', () => {
    it('strips Python whitespace, not JavaScript trim()', () => {
        // \x1c-\x1f are whitespace in Python but not for trim(); U+FEFF is the reverse
        expect(strip('\x1c\x1fhi\x85')).to.equal('hi')
        expect(strip('﻿hi﻿')).to.equal('﻿hi﻿')
        expect(strip('😀a😀', '😀')).to.equal('a')
    })

    it('counts code points, not UTF-16 units', () => {
        expect(find('😀a😀b', 'b')).to.equal(3)
        expect(rfind('😀a😀b', '😀')).to.equal(2)
        expect(rindex('😀😀', '😀')).to.equal(1)
        expect(startswith('😀ab', 'a', 1)).to.equal(true)
        expect(endswith('ab😀', 'b', 0, -1)).to.equal(true)
        expect(center('😀', 3, '*')).to.equal('*😀*')
        expect(ljust('😀', 3, '😀')).to.equal('😀😀😀')
        expect(rjust('é', 2)).to.equal(' é')
        expect(zfill('-😀', 4)).to.equal('-00😀')
        expect(expandtabs('😀\tx', 4)).to.equal('😀   x')
        expect(replace('😀😀', '', '-')).to.equal('-😀-😀-')
    })

    it('uses Python defaults when optional arguments are omitted', () => {
        expect(split('  a  b ')).to.deep.equal(['a', 'b'])
        expect(split('a,b,c', ',')).to.deep.equal(['a', 'b', 'c'])
        expect(split('a b c', null, 1)).to.deep.equal(['a', 'b c'])
        expect(split('a b c', undefined, 1)).to.deep.equal(['a', 'b c'])
        expect(rsplit('a b c', null, 1)).to.deep.equal(['a b', 'c'])
        expect(splitlines('a\r\nb\n')).to.deep.equal(['a', 'b'])
        expect(splitlines('a\r\nb\n', true)).to.deep.equal(['a\r\n', 'b\n'])
        expect(replace('aaa', 'a', 'b')).to.equal('bbb')
        expect(replace('aaa', 'a', 'b', 2)).to.equal('bba')
        expect(expandtabs('\t')).to.equal(' '.repeat(8))
        expect(center('a', 4)).to.equal(' a  ')
        expect(center('a', 5)).to.equal('  a  ')
        expect(center('ab', 5)).to.equal('  ab ')
    })

    it('accepts arrays where Python takes tuples', () => {
        expect(startswith('image.png', ['.jpg', 'image'])).to.equal(true)
        expect(endswith('image.png', ['.jpg', '.png'])).to.equal(true)
        expect(endswith('image.png', [])).to.equal(false)
    })

    it('joins any iterable of strings, including Sets, generators and object keys', () => {
        expect(join('-', new Set(['a', 'b']))).to.equal('a-b')
        expect(
            join(
                '',
                (function* () {
                    yield 'x'
                    yield 'y'
                })(),
            ),
        ).to.equal('xy')
        expect(join(',', {a: 1, b: 2})).to.equal('a,b')
        expect(join(',', new Map([['k', 1]]))).to.equal('k')
        expect(() => join(',', ['a', 1])).to.throw(TypeError, 'sequence item 1: expected str instance, int found')
        expect(() => join(',', [1.5])).to.throw(TypeError, 'expected str instance, float found')
    })

    it('returns arrays for partition', () => {
        expect(partition('k=v=w', '=')).to.deep.equal(['k', '=', 'v=w'])
        expect(partition('kv', '=')).to.deep.equal(['kv', '', ''])
    })

    it('raises Python exceptions', () => {
        expect(() => split('a', '')).to.throw(ValueError, 'empty separator')
        expect(() => rindex('a', 'b')).to.throw(ValueError, 'substring not found')
        expect(() => center('a', 3, '**')).to.throw(TypeError)
        expect(() => strip(5)).to.throw(TypeError)
        expect(() => find('a', 'a', 0.5)).to.throw(TypeError)
    })

    it('handles Unicode case rules', () => {
        expect(title("they're bill's")).to.equal("They'Re Bill'S")
        expect(title('ǆungla')).to.equal('ǅungla')
        expect(title('ßa')).to.equal('Ssa')
        expect(capitalize('ΣΑΣ ΣΑΣ')).to.equal('Σας σας')
        expect(swapcase('ΑΣ')).to.equal('ας')
        expect(casefold('Straße')).to.equal('strasse')
        expect(casefold('ﬁ')).to.equal('fi')
    })

    it('has Python-like character predicates', () => {
        expect(isdigit('²')).to.equal(true)
        expect(isnumeric('½一')).to.equal(true)
        expect(isalpha('é中')).to.equal(true)
        expect(isalpha('')).to.equal(false)
        expect(isspace('\x1c　')).to.equal(true)
        expect(isidentifier('_x1')).to.equal(true)
        expect(isidentifier('1x')).to.equal(false)
    })

    it('never mutates and chains naturally', () => {
        const s = '  Hello, World  '
        expect(split(strip(s).toLowerCase(), ', ')).to.deep.equal(['hello', 'world'])
        expect(s).to.equal('  Hello, World  ')
    })
})
