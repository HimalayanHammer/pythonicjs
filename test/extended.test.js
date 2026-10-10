const py = require('../pythonicjs')

const {expect} = require('chai');

describe('module exports', () => {
    it('exports a callable that installs globals and returns the API', () => {
        expect(py).to.be.a('function');
        const api = py();
        expect(api.sum).to.equal(sum);
        expect(api.range).to.be.a('function');
    });

    it('exposes every function as a property for destructuring', () => {
        const {sum: s, range: r} = require('../pythonicjs');
        expect(s(r(5))).to.equal(10);
    });

    it('install(target) installs onto a custom object', () => {
        const target = {};
        py.install(target);
        expect(target.len('abc')).to.equal(3);
    });
});

describe('equals', () => {
    it('compares nested objects deeply', () => {
        expect(equals({a: {b: 1}}, {a: {c: 2}})).to.be.false;
        expect(equals({a: {b: 1}, c: [1, 2]}, {c: [1, 2], a: {b: 1}})).to.be.true;
    });

    it('handles primitives, null, NaN and dates', () => {
        expect(equals(1, 1)).to.be.true;
        expect(equals(1, '1')).to.be.false;
        expect(equals(null, {})).to.be.false;
        expect(equals(NaN, NaN)).to.be.true;
        expect(equals(new Date(0), new Date(0))).to.be.true;
        expect(equals([1, 2], {0: 1, 1: 2})).to.be.false;
    });

    it('compares Maps and Sets', () => {
        expect(equals(new Map([['a', [1]]]), new Map([['a', [1]]]))).to.be.true;
        expect(equals(new Set([1, 2]), new Set([2, 1]))).to.be.true;
        expect(equals(new Set([1]), new Set([2]))).to.be.false;
    });
});

describe('sorted', () => {
    it('sorts strings by code point', () => {
        expect(sorted(['b', 'a', 'C'])).to.deep.equal(['C', 'a', 'b']);
    });

    it('applies key to numbers and objects', () => {
        expect(sorted([3, -5, 1], x => Math.abs(x))).to.deep.equal([1, 3, -5]);
        expect(sorted([{n: 2}, {n: 1}], o => o.n)).to.deep.equal([{n: 1}, {n: 2}]);
    });

    it('accepts an options object like Python keyword arguments', () => {
        expect(sorted(['bb', 'a', 'ccc'], {key: len, reverse: true})).to.deep.equal(['ccc', 'bb', 'a']);
    });

    it('is stable, including when reversed', () => {
        const items = [[1, 'a'], [0, 'b'], [1, 'c']];
        expect(sorted(items, x => x[0], true)).to.deep.equal([[1, 'a'], [1, 'c'], [0, 'b']]);
    });

    it('sorts tuples lexicographically', () => {
        expect(sorted([[2, 1], [1, 2], [1, 1]])).to.deep.equal([[1, 1], [1, 2], [2, 1]]);
    });

    it('sorts Sets into arrays and does not mutate input', () => {
        const input = [3, 1, 2];
        expect(sorted(new Set([3, 1, 2]))).to.deep.equal([1, 2, 3]);
        sorted(input);
        expect(input).to.deep.equal([3, 1, 2]);
    });
});

describe('max and min', () => {
    it('accept several arguments', () => {
        expect(max(1, 5, 3)).to.equal(5);
        expect(min(4, 2, 8)).to.equal(2);
    });

    it('accept a key and a default', () => {
        expect(max(['a', 'abc', 'ab'], {key: len})).to.equal('abc');
        expect(min([], {default: 0})).to.equal(0);
        expect(() => max([])).to.throw(Error, 'Input must be a non-empty array');
    });

    it('work on strings and large arrays', () => {
        expect(max(['pear', 'apple', 'zoo'])).to.equal('zoo');
        expect(max(range(200000))).to.equal(199999);
    });
});

describe('conversions', () => {
    it('str handles null and undefined', () => {
        expect(str(null)).to.equal('null');
        expect(str(undefined)).to.equal('undefined');
    });

    it('int parses strings strictly and truncates numbers', () => {
        expect(int(' -42 ')).to.equal(-42);
        expect(int(3.9)).to.equal(3);
        expect(int(-3.9)).to.equal(-3);
        expect(int('ff', 16)).to.equal(255);
        expect(int('1_000')).to.equal(1000);
        expect(int(true)).to.equal(1);
        expect(() => int('12px')).to.throw(Error);
        expect(() => int('')).to.throw(Error);
    });

    it('float parses strings strictly', () => {
        expect(float(' 1e3 ')).to.equal(1000);
        expect(float('.5')).to.equal(0.5);
        expect(float('inf')).to.equal(Infinity);
        expect(float('-Infinity')).to.equal(-Infinity);
        expect(float('nan')).to.be.NaN;
        expect(() => float('')).to.throw(Error);
        expect(() => float('3.14abc')).to.throw(Error);
    });

    it('bool follows Python truthiness', () => {
        expect(bool([])).to.be.false;
        expect(bool({})).to.be.false;
        expect(bool(new Map())).to.be.false;
        expect(bool('')).to.be.false;
        expect(bool(0)).to.be.false;
        expect(bool([0])).to.be.true;
        expect(bool('a')).to.be.true;
    });

    it('not treats empty Maps and Sets as falsy', () => {
        expect(not(new Set())).to.be.true;
        expect(not(new Set([1]))).to.be.false;
        expect(not(undefined)).to.be.true;
    });

    it('type returns null for null', () => {
        expect(type(null)).to.equal('null');
        expect(type([])).to.equal('array');
    });

    it('hex, oct and bin match Python', () => {
        expect(hex(-1)).to.equal('-0x1');
        expect(hex(2 ** 40)).to.equal('0x10000000000');
        expect(oct(8)).to.equal('0o10');
        expect(bin(5)).to.equal('0b101');
        expect(bin(-5)).to.equal('-0b101');
        expect(hex(255n)).to.equal('0xff');
        expect(() => hex(2.5)).to.throw(TypeError);
    });

    it('chr and ord are inverses', () => {
        expect(chr(97)).to.equal('a');
        expect(ord('a')).to.equal(97);
        expect(ord('😀')).to.equal(0x1F600);
        expect(chr(0x1F600)).to.equal('😀');
        expect(() => ord('ab')).to.throw(TypeError);
    });

    it('list converts iterables to arrays', () => {
        expect(list('abc')).to.deep.equal(['a', 'b', 'c']);
        expect(list(new Set([1, 2]))).to.deep.equal([1, 2]);
        expect(list({a: 1, b: 2})).to.deep.equal(['a', 'b']);
        expect(list()).to.deep.equal([]);
    });
});

describe('math', () => {
    it('divmod uses floor division like Python', () => {
        expect(divmod(7, 2)).to.deep.equal([3, 1]);
        expect(divmod(-7, 2)).to.deep.equal([-4, 1]);
        expect(() => divmod(1, 0)).to.throw(Error);
    });

    it('pow supports a modulus', () => {
        expect(pow(2, 10)).to.equal(1024);
        expect(pow(3, 200, 13)).to.equal(9);
    });

    it('sum accepts a start value and any iterable', () => {
        expect(sum([1, 2, 3], 10)).to.equal(16);
        expect(sum(new Set([1, 2]))).to.equal(3);
    });

    it('randint and choice stay in range', () => {
        for (let i = 0; i < 50; i++) {
            const n = randint(1, 3);
            expect(n).to.be.within(1, 3);
            expect([4, 5, 6]).to.include(choice([4, 5, 6]));
        }
        expect(() => choice([])).to.throw(Error);
    });

    it('shuffle keeps the same elements', () => {
        const a = range(20);
        shuffle(a);
        expect(sorted(a)).to.deep.equal(range(20));
    });
});

describe('iteration helpers', () => {
    it('range handles steps and rejects a zero step', () => {
        expect(range(5, 0, -2)).to.deep.equal([5, 3, 1]);
        expect(range(0, 5, -1)).to.deep.equal([]);
        expect(() => range(0, 5, 0)).to.throw(Error, 'must not be zero');
    });

    it('enumerate and zip', () => {
        expect(enumerate(['a', 'b'], 1)).to.deep.equal([[1, 'a'], [2, 'b']]);
        expect(zip([1, 2, 3], 'ab')).to.deep.equal([[1, 'a'], [2, 'b']]);
        expect(zip()).to.deep.equal([]);
    });

    it('any and all use Python truthiness', () => {
        expect(any([0, '', []])).to.be.false;
        expect(any([0, [1]])).to.be.true;
        expect(all([1, 'a', [0]])).to.be.true;
        expect(all([1, {}])).to.be.false;
        expect(all([])).to.be.true;
    });

    it('filter(null, ...) keeps truthy items', () => {
        expect(filter(null, [0, 1, '', 'a', [], [2]])).to.deep.equal([1, 'a', [2]]);
    });

    it('map works over several iterables and passes only the item', () => {
        expect(map((a, b) => a + b, [1, 2, 3], [10, 20])).to.deep.equal([11, 22]);
        expect(map(int, ['1', '2', '3'])).to.deep.equal([1, 2, 3]);
    });

    it('reversed works on strings', () => {
        expect(reversed('abc')).to.deep.equal(['c', 'b', 'a']);
    });

    it('intersection with no arguments returns an empty array', () => {
        expect(intersection()).to.deep.equal([]);
    });

    it('len supports objects, Maps and Sets', () => {
        expect(len({a: 1, b: 2})).to.equal(2);
        expect(len(new Map([[1, 2]]))).to.equal(1);
        expect(len(new Set([1, 2, 3]))).to.equal(3);
    });
});

describe('list and string methods', () => {
    it('pop raises on empty lists and supports negative indexes', () => {
        expect(() => pop([])).to.throw(Error, 'pop from empty list');
        const a = [1, 2, 3];
        expect(pop(a, -2)).to.equal(2);
        expect(a).to.deep.equal([1, 3]);
        expect(() => pop(a, 5)).to.throw(Error, 'out of range');
    });

    it('extend accepts any iterable', () => {
        const a = [1];
        extend(a, new Set([2, 3]));
        extend(a, 'ab');
        expect(a).to.deep.equal([1, 2, 3, 'a', 'b']);
    });

    it('clear empties arrays, Maps and objects', () => {
        const m = new Map([[1, 2]]);
        const o = {a: 1};
        clear(m);
        clear(o);
        expect(m.size).to.equal(0);
        expect(o).to.deep.equal({});
    });

    it('count works on strings', () => {
        expect(count('banana', 'an')).to.equal(2);
        expect(count('aaaa', 'aa')).to.equal(2);
    });

    it('strip, lstrip and rstrip accept characters to remove', () => {
        expect(strip('xx-hello-xx', 'x-')).to.equal('hello');
        expect(lstrip('  hi  ')).to.equal('hi  ');
        expect(rstrip('  hi  ')).to.equal('  hi');
        expect(rstrip('a]]', ']')).to.equal('a');
    });
});

describe('objects', () => {
    it('items returns key/value pairs', () => {
        expect(items({a: 1})).to.deep.equal([['a', 1]]);
        expect(items(new Map([['k', 'v']]))).to.deep.equal([['k', 'v']]);
    });

    it('is_empty handles null, strings, Maps and Sets', () => {
        expect(is_empty(null)).to.be.true;
        expect(is_empty('')).to.be.true;
        expect(is_empty(new Map())).to.be.true;
        expect(is_empty(new Set([1]))).to.be.false;
    });

    it('deepcopy keeps dates, Maps, Sets and circular references', () => {
        const original = {d: new Date(0), m: new Map([['a', {x: 1}]]), s: new Set([1])};
        original.self = original;
        const clone = deepcopy(original);
        expect(clone.d).to.be.instanceOf(Date);
        expect(clone.d.getTime()).to.equal(0);
        expect(clone.m.get('a')).to.deep.equal({x: 1});
        expect(clone.m.get('a')).to.not.equal(original.m.get('a'));
        expect(clone.s.has(1)).to.be.true;
        expect(clone.self).to.equal(clone);
    });

    it('copy handles Maps, Sets and primitives', () => {
        const m = new Map([[1, 2]]);
        expect(copy(m)).to.not.equal(m);
        expect(copy(m).get(1)).to.equal(2);
        expect(copy(5)).to.equal(5);
    });

    it('getattr returns a default for missing attributes', () => {
        expect(getattr({a: 1}, 'b', 'none')).to.equal('none');
        expect(getattr({a: 1}, 'a', 'none')).to.equal(1);
    });

    it('hasattr works on primitives and null', () => {
        expect(hasattr('abc', 'length')).to.be.true;
        expect(hasattr(null, 'x')).to.be.false;
    });
});

describe('review regressions', () => {
    it('pow with a modulus stays exact for large values', () => {
        expect(pow(3, 200, 1e9 + 7)).to.equal(136318165);
        expect(pow(2, 0, 1)).to.equal(0);
        expect(pow(-2, 3, 5)).to.equal(2);
        expect(() => pow(2, 3, 0)).to.throw(Error);
    });

    it('sorted works on strings and orders by code point', () => {
        expect(sorted('cba')).to.deep.equal(['a', 'b', 'c']);
        expect(sorted(['\u{1F600}', '～'])).to.deep.equal(['～', '\u{1F600}']);
        expect(max('～', '\u{1F600}')).to.equal('\u{1F600}');
    });

    it('sorted and max raise TypeError for values Python cannot order', () => {
        expect(() => sorted(['a', 9, '10'])).to.throw(TypeError, 'not supported');
        expect(() => max('a', 9)).to.throw(TypeError);
        expect(() => sorted([{a: 1}, {a: 2}])).to.throw(TypeError);
        expect(sorted([true, 2, 0])).to.deep.equal([0, true, 2]);
        expect(sorted([new Date(2), new Date(1)]).map(d => d.getTime())).to.deep.equal([1, 2]);
    });

    it('strip handles characters outside the BMP', () => {
        expect(strip('\u{1F600}x', '\u{1F601}')).to.equal('\u{1F600}x');
        expect(strip('\u{1F601}x\u{1F601}', '\u{1F601}')).to.equal('x');
    });

    it('int supports base 0 and prefixes and validates underscores', () => {
        expect(int('0x1f', 16)).to.equal(31);
        expect(int('0x1f', 0)).to.equal(31);
        expect(int('0b101', 0)).to.equal(5);
        expect(int('-0o17', 0)).to.equal(-15);
        expect(int('10', 0)).to.equal(10);
        expect(int('000', 0)).to.equal(0);
        expect(() => int('010', 0)).to.throw(Error);
        expect(() => int('z', 40)).to.throw(Error, 'base');
        expect(() => int('_1__0_')).to.throw(Error);
        expect(() => float('_1__0_')).to.throw(Error);
        expect(float('1_000.5')).to.equal(1000.5);
        expect(Object.is(int(-0.5), 0)).to.be.true;
        expect(Object.is(round(-0.4), 0)).to.be.true;
    });

    it('pop and range reject non-integers', () => {
        expect(() => pop([1, 2, 3], 1.5)).to.throw(TypeError);
        expect(() => pop([1, 2, 3], NaN)).to.throw(TypeError);
        expect(() => range(0, 0.3, 0.1)).to.throw(TypeError);
    });

    it('copy and deepcopy keep dates, typed arrays and prototypes', () => {
        class Point { constructor() { this.x = 1 } norm() { return this.x } }
        expect(copy(new Date(5)).getTime()).to.equal(5);
        expect(copy(new Point()).norm()).to.equal(1);
        const bytes = deepcopy(new Uint8Array([1, 2]));
        expect(Array.from(bytes)).to.deep.equal([1, 2]);
        const d = new Date(0);
        const c = deepcopy({a: d, b: d});
        expect(c.a).to.equal(c.b);
        expect(c.a).to.not.equal(d);
    });

    it('index and count compare by value like Python', () => {
        expect(index([[1], [2]], [2])).to.equal(1);
        expect(count([[1], [1], 1], [1])).to.equal(2);
        expect(index('hello', 'l')).to.equal(2);
    });

    it('equals compares regular expressions', () => {
        expect(equals(/a/g, /a/g)).to.be.true;
        expect(equals(/a/, /b/)).to.be.false;
    });
});
