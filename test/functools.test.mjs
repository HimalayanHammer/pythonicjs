import {expect} from 'chai'
import {functools, heapq, max, sorted} from 'pythonicjs'
import {cache, cmp_to_key, lru_cache, partial, reduce} from 'pythonicjs/functools'

describe('functools', () => {
    it('is exposed as a namespace and a subpath', () => {
        expect(functools.reduce).to.equal(reduce)
    })

    it('reduce folds from the left', () => {
        expect(reduce((a, b) => a - b, [10, 2, 3])).to.equal(5)
        expect(reduce((acc, x) => acc + x.length, ['ab', 'c'], 0)).to.equal(3)
        expect(reduce((a, b) => a + b, new Set([1, 2]))).to.equal(3)
        expect(reduce((a, b) => a + b, [], undefined)).to.equal(undefined)
        expect(() => reduce((a, b) => a + b, [])).to.throw(TypeError, 'reduce() of empty iterable with no initial value')
    })

    it('partial fixes leading arguments and exposes func and args', () => {
        const add3 = (a, b, c) => a + b + c
        const p = partial(add3, 1)
        expect(p(2, 3)).to.equal(6)
        expect(p.func).to.equal(add3)
        expect(p.args).to.deep.equal([1])
        const q = partial(p, 2)
        expect(q(3)).to.equal(6)
        expect(q.func).to.equal(add3)
        expect(q.args).to.deep.equal([1, 2])
    })

    it('lru_cache evicts the least recently used entry', () => {
        const ran = []
        const f = lru_cache(2)((x) => {
            ran.push(x)
            return x * 2
        })
        f(1)
        f(2)
        f(1) // hit, 1 becomes most recent
        f(3) // evicts 2
        f(2) // miss, evicts 1
        f(1) // miss
        expect(ran).to.deep.equal([1, 2, 3, 2, 1])
        expect(f.cache_info()).to.deep.equal({hits: 1, misses: 5, maxsize: 2, currsize: 2})
        f.cache_clear()
        expect(f.cache_info()).to.deep.equal({hits: 0, misses: 0, maxsize: 2, currsize: 0})
    })

    it('lru_cache can be applied directly, and maxsize 0 or null', () => {
        const f = lru_cache((x) => x)
        f(1)
        expect(f.cache_info().maxsize).to.equal(128)
        const g = lru_cache(0)((x) => x)
        g(1)
        g(1)
        expect(g.cache_info()).to.deep.equal({hits: 0, misses: 2, maxsize: 0, currsize: 0})
        const h = lru_cache(null)((x) => x)
        for (let i = 0; i < 300; i++) {
            h(i)
        }
        expect(h.cache_info().currsize).to.equal(300)
    })

    it('cache keys on primitives and tuples of them', () => {
        let calls = 0
        const f = cache((...args) => {
            calls++
            return args.length
        })
        f([1, 'a'], 2)
        f([1, 'a'], 2)
        f(1n, true)
        f(1, 1)
        f('1', 1)
        expect(calls).to.equal(3)
        expect(f.cache_info()).to.deep.equal({hits: 2, misses: 3, maxsize: null, currsize: 3})
        expect(() => f({a: 1})).to.throw(TypeError, "unhashable type: 'dict'")
        const g = cache(() => ({}))
        expect(g(new Date(0))).to.not.equal(g(new Date(0)))
        expect(f.__wrapped__).to.be.a('function')
    })

    it('caches methods per instance', () => {
        class Box {
            constructor(v) {
                this.v = v
            }
        }
        Box.prototype.get = cache(function () {
            return this.v
        })
        expect(new Box(1).get()).to.equal(1)
        expect(new Box(2).get()).to.equal(2)
    })

    it('cmp_to_key works with sorted, max and heapq', () => {
        const byLength = cmp_to_key((a, b) => a.length - b.length)
        expect(sorted(['ccc', 'a', 'bb'], {key: byLength})).to.deep.equal(['a', 'bb', 'ccc'])
        expect(max(['ccc', 'a', 'bb'], {key: byLength})).to.equal('ccc')
        expect(heapq.nsmallest(1, ['ccc', 'a', 'bb'], byLength)).to.deep.equal(['a'])
        const k = byLength('ab')
        expect(k.obj).to.equal('ab')
        expect(k.__lt__(byLength('abc'))).to.equal(true)
        expect(k.__eq__(byLength('xy'))).to.equal(true)
    })
})
