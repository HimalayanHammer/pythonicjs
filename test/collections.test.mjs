import {expect} from 'chai'
import {
    bool,
    Counter,
    collections,
    copy,
    deepcopy,
    defaultdict,
    deque,
    equals,
    IndexError,
    KeyError,
    len,
    namedtuple,
    OrderedDict,
    sorted,
    ValueError,
} from 'pythonicjs'
import * as sub from 'pythonicjs/collections'

describe('collections', () => {
    it('is exported from the root, as a namespace and as a subpath', () => {
        expect(collections.Counter).to.equal(Counter)
        expect(sub.deque).to.equal(deque)
    })

    describe('Counter', () => {
        it('is a Map that counts', () => {
            const c = new Counter('abracadabra')
            expect(c).to.be.instanceOf(Map)
            expect([...c]).to.deep.equal([
                ['a', 5],
                ['b', 2],
                ['r', 2],
                ['c', 1],
                ['d', 1],
            ])
            expect(c.get('a')).to.equal(5)
            expect(len(c)).to.equal(5)
        })

        it('returns 0 for missing keys without inserting them', () => {
            const c = new Counter(['x'])
            expect(c.get('y')).to.equal(0)
            expect(c.has('y')).to.equal(false)
            expect(c.size).to.equal(1)
        })

        it('builds from Maps and plain objects', () => {
            expect([...new Counter(new Map([[1, 2]]))]).to.deep.equal([[1, 2]])
            expect([...new Counter({a: 3})]).to.deep.equal([['a', 3]])
            expect(new Counter().size).to.equal(0)
        })

        it('has most_common, elements, total, update and subtract', () => {
            const c = new Counter('aabbbc')
            expect(c.most_common(2)).to.deep.equal([
                ['b', 3],
                ['a', 2],
            ])
            expect([...c.elements()]).to.deep.equal(['a', 'a', 'b', 'b', 'b', 'c'])
            expect(c.total()).to.equal(6)
            c.subtract('cccc')
            expect(c.get('c')).to.equal(-3)
            c.update({c: 3})
            expect(c.get('c')).to.equal(0)
        })

        it('does multiset arithmetic', () => {
            const a = new Counter({x: 3, y: 1})
            const b = new Counter({x: 1, y: 2, z: 1})
            expect(Object.fromEntries(a.plus(b))).to.deep.equal({x: 4, y: 3, z: 1})
            expect(Object.fromEntries(a.minus(b))).to.deep.equal({x: 2})
            expect(Object.fromEntries(a.and(b))).to.deep.equal({x: 1, y: 1})
            expect(Object.fromEntries(a.or(b))).to.deep.equal({x: 3, y: 2, z: 1})
            const n = new Counter({p: 2, q: -2})
            expect(Object.fromEntries(n.pos())).to.deep.equal({p: 2})
            expect(Object.fromEntries(n.neg())).to.deep.equal({q: 2})
            expect(a.plus(b)).to.be.instanceOf(Counter)
        })

        it('has Python repr, equality and JSON', () => {
            const c = new Counter('abb')
            expect(c.__repr__()).to.equal("Counter({'b': 2, 'a': 1})")
            expect(String(new Counter())).to.equal('Counter()')
            expect(equals(c, new Counter({a: 1, b: 2, z: 0}))).to.equal(true)
            expect(JSON.stringify(c)).to.equal('{"a":1,"b":2}')
            const d = c.copy()
            d.set('a', 9)
            expect(c.get('a')).to.equal(1)
            expect(d).to.be.instanceOf(Counter)
        })

        it('keeps its class through deepcopy', () => {
            const d = deepcopy(new Counter('aa'))
            expect(d).to.be.instanceOf(Counter)
            expect(d.get('a')).to.equal(2)
        })
    })

    describe('defaultdict', () => {
        it('inserts default_factory() on get', () => {
            const d = new defaultdict(() => [])
            d.get('a').push(1)
            d.get('a').push(2)
            expect([...d]).to.deep.equal([['a', [1, 2]]])
            expect(d.has('b')).to.equal(false)
            expect(d.size).to.equal(1)
        })

        it('raises KeyError without a factory', () => {
            const d = new defaultdict(null, [['a', 1]])
            expect(d.get('a')).to.equal(1)
            expect(() => d.get('b')).to.throw(KeyError, "'b'")
            expect(d.default_factory).to.equal(null)
        })

        it('rejects non-callable factories', () => {
            expect(() => new defaultdict(5)).to.throw(TypeError)
        })

        it('has repr, copy and JSON', () => {
            function list() {
                return []
            }
            const d = new defaultdict(list, {a: [1]})
            expect(d.__repr__()).to.equal("defaultdict(<function list>, {'a': [1]})")
            const c = d.copy()
            expect(c).to.be.instanceOf(defaultdict)
            expect(c.default_factory).to.equal(list)
            expect(JSON.stringify(d)).to.equal('{"a":[1]}')
        })
    })

    describe('deque', () => {
        it('appends and pops at both ends', () => {
            const d = new deque([2, 3])
            d.appendleft(1)
            d.append(4)
            expect(d.toArray()).to.deep.equal([1, 2, 3, 4])
            expect(d.popleft()).to.equal(1)
            expect(d.pop()).to.equal(4)
            expect(d.length).to.equal(2)
            expect(() => new deque().pop()).to.throw(IndexError, 'pop from an empty deque')
            expect(() => new deque().popleft()).to.throw(IndexError, 'pop from an empty deque')
        })

        it('grows and wraps around its ring buffer', () => {
            const d = new deque()
            const ref = []
            for (let i = 0; i < 1000; i++) {
                if (i % 3 === 0) {
                    d.appendleft(i)
                    ref.unshift(i)
                } else {
                    d.append(i)
                    ref.push(i)
                }
                if (i % 5 === 0) {
                    expect(d.popleft()).to.equal(ref.shift())
                }
            }
            expect([...d]).to.deep.equal(ref)
        })

        it('drops items from the other end at maxlen', () => {
            const d = new deque([1, 2, 3], 3)
            d.append(4)
            expect([...d]).to.deep.equal([2, 3, 4])
            d.appendleft(0)
            expect([...d]).to.deep.equal([0, 2, 3])
            expect(d.maxlen).to.equal(3)
            expect(() => d.insert(1, 9)).to.throw(IndexError, 'deque already at its maximum size')
            expect(() => new deque([], -1)).to.throw(ValueError)
        })

        it('rotates, reverses, indexes and removes', () => {
            const d = new deque([1, 2, 3, 4, 5])
            d.rotate(2)
            expect([...d]).to.deep.equal([4, 5, 1, 2, 3])
            d.rotate(-3)
            expect([...d]).to.deep.equal([2, 3, 4, 5, 1])
            d.reverse()
            expect([...d]).to.deep.equal([1, 5, 4, 3, 2])
            expect(d.at(-1)).to.equal(2)
            d.set(0, 9)
            expect(d.at(0)).to.equal(9)
            expect(() => d.at(5)).to.throw(IndexError, 'deque index out of range')
            expect(d.index(4)).to.equal(2)
            expect(() => d.index(4, 3)).to.throw(ValueError)
            d.remove(4)
            expect(() => d.remove(4)).to.throw(ValueError)
            expect(d.count(9)).to.equal(1)
            expect(d.includes(3)).to.equal(true)
            d.insert(-1, 7)
            expect([...d]).to.deep.equal([9, 5, 3, 7, 2])
            d.clear()
            expect(d.length).to.equal(0)
        })

        it('works with len, bool, copy, equals, sorted and JSON', () => {
            const d = new deque([1, 2], 4)
            expect(len(d)).to.equal(2)
            expect(bool(d)).to.equal(true)
            expect(bool(new deque())).to.equal(false)
            const c = copy(d)
            expect(c).to.not.equal(d)
            expect(c.maxlen).to.equal(4)
            expect(equals(c, d)).to.equal(true)
            expect(equals(d, [1, 2])).to.equal(false)
            expect(sorted([new deque([2]), new deque([1, 9])]).map((x) => x.toArray())).to.deep.equal([[1, 9], [2]])
            expect(JSON.stringify(d)).to.equal('[1,2]')
            expect(d.__repr__()).to.equal('deque([1, 2], maxlen=4)')
            expect(String(new deque(['a']))).to.equal("deque(['a'])")
        })

        it('survives deepcopy', () => {
            const d = new deque([[1], [2]])
            const e = deepcopy(d)
            e.at(0).push(5)
            e.append([3])
            expect([...d]).to.deep.equal([[1], [2]])
            expect([...e]).to.deep.equal([[1, 5], [2], [3]])
        })
    })

    describe('OrderedDict', () => {
        it('moves keys and pops items from either end', () => {
            const od = new OrderedDict([
                ['a', 1],
                ['b', 2],
                ['c', 3],
            ])
            od.move_to_end('a')
            expect([...od.keys()]).to.deep.equal(['b', 'c', 'a'])
            od.move_to_end('a', false)
            expect([...od.keys()]).to.deep.equal(['a', 'b', 'c'])
            expect(od.popitem()).to.deep.equal(['c', 3])
            expect(od.popitem(false)).to.deep.equal(['a', 1])
            expect(() => od.move_to_end('zz')).to.throw(KeyError)
            od.clear()
            expect(() => od.popitem()).to.throw(KeyError, 'dictionary is empty')
        })

        it('is order-sensitive only against another OrderedDict', () => {
            const a = new OrderedDict({x: 1, y: 2})
            expect(equals(a, new OrderedDict({y: 2, x: 1}))).to.equal(false)
            expect(
                equals(
                    a,
                    new Map([
                        ['y', 2],
                        ['x', 1],
                    ]),
                ),
            ).to.equal(true)
            expect(a.__repr__()).to.equal("OrderedDict({'x': 1, 'y': 2})")
        })
    })

    describe('namedtuple', () => {
        const Point = namedtuple('Point', ['x', 'y'])

        it('makes frozen tuple-like instances', () => {
            const p = new Point(1, 2)
            expect(p.x).to.equal(1)
            expect(p[1]).to.equal(2)
            expect(Array.isArray(p)).to.equal(true)
            expect(Object.isFrozen(p)).to.equal(true)
            const [x, y] = p
            expect([x, y]).to.deep.equal([1, 2])
            expect(len(p)).to.equal(2)
            expect(JSON.stringify(p)).to.equal('[1,2]')
            expect(p.map((v) => v * 10)).to.deep.equal([10, 20])
            expect(p).to.be.instanceOf(Point)
        })

        it('has _fields, _asdict, _replace and _make', () => {
            const p = new Point(1, 2)
            expect(Point._fields).to.deep.equal(['x', 'y'])
            expect(p._fields).to.deep.equal(['x', 'y'])
            expect(p._asdict()).to.deep.equal({x: 1, y: 2})
            expect(p._replace({y: 5}).y).to.equal(5)
            expect(() => p._replace({z: 5})).to.throw(TypeError, "Got unexpected field names: ['z']")
            expect(Point._make([3, 4]).x).to.equal(3)
            expect(() => Point._make([3])).to.throw(TypeError, 'Expected 2 arguments, got 1')
        })

        it('supports defaults, string field lists and subclasses', () => {
            const T = namedtuple('T', 'a, b c', {defaults: [2, 3]})
            expect(new T(1).__repr__()).to.equal('T(a=1, b=2, c=3)')
            expect(T._field_defaults).to.deep.equal({b: 2, c: 3})
            expect(() => new T()).to.throw(TypeError, "T.__new__() missing 1 required positional argument: 'a'")
            class Vec extends namedtuple('Vec', ['x', 'y']) {
                norm() {
                    return Math.hypot(this.x, this.y)
                }
            }
            const v = new Vec(3, 4)
            expect(v.norm()).to.equal(5)
            expect(v.__repr__()).to.equal('Vec(x=3, y=4)')
        })

        it('compares and prints like a tuple', () => {
            expect(new Point(1, 'a').__repr__()).to.equal("Point(x=1, y='a')")
            expect(equals(new Point(1, 2), [1, 2])).to.equal(true)
            expect(new Point(1, 2).__lt__(new Point(1, 3))).to.equal(true)
            expect(sorted([new Point(2, 0), new Point(1, 5)]).map(String)).to.deep.equal(['Point(x=1, y=5)', 'Point(x=2, y=0)'])
        })

        it('validates names like Python', () => {
            expect(() => namedtuple('T', ['_a'])).to.throw(ValueError)
            expect(() => namedtuple('T', ['a', 'a'])).to.throw(ValueError)
            expect(() => namedtuple('T', ['class'])).to.throw(ValueError)
            expect(() => namedtuple('T', ['length'])).to.throw(ValueError)
            expect(namedtuple('T', ['a', 'a', 'length'], {rename: true})._fields).to.deep.equal(['a', '_1', '_2'])
        })
    })
})
