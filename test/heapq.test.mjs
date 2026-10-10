import {expect} from 'chai'
import {heapq, IndexError} from 'pythonicjs'
import {
    heapify,
    heapify_max,
    heappop,
    heappop_max,
    heappush,
    heappush_max,
    heappushpop,
    heappushpop_max,
    heapreplace,
    heapreplace_max,
    merge,
    nlargest,
    nsmallest,
} from 'pythonicjs/heapq'

const isMinHeap = (h) => h.every((x, i) => i === 0 || h[(i - 1) >> 1] <= x)
const isMaxHeap = (h) => h.every((x, i) => i === 0 || h[(i - 1) >> 1] >= x)

describe('heapq', () => {
    it('is exposed as a namespace and a subpath', () => {
        expect(heapq.heappush).to.equal(heappush)
    })

    it('keeps a min-heap in a plain array', () => {
        const h = []
        for (const x of [5, 1, 4, 1, 3, 9, 2]) {
            heappush(h, x)
            expect(isMinHeap(h)).to.equal(true)
        }
        const out = []
        while (h.length) {
            out.push(heappop(h))
        }
        expect(out).to.deep.equal([1, 1, 2, 3, 4, 5, 9])
        expect(() => heappop([])).to.throw(IndexError, 'index out of range')
    })

    it('has heapify, heapreplace and heappushpop', () => {
        const h = [9, 4, 7, 1]
        heapify(h)
        expect(h).to.deep.equal([1, 4, 7, 9])
        expect(heapreplace(h, 0)).to.equal(1)
        expect(h[0]).to.equal(0)
        expect(heappushpop(h, -1)).to.equal(-1)
        expect(heappushpop(h, 5)).to.equal(0)
        expect(() => heapreplace([], 1)).to.throw(IndexError)
    })

    it('orders tuples (arrays) and strings like Python', () => {
        const h = []
        heappush(h, [2, 'b'])
        heappush(h, [1, 'z'])
        heappush(h, [1, 'a'])
        expect(heappop(h)).to.deep.equal([1, 'a'])
        const s = ['b', 'B', 'a']
        heapify(s)
        expect(s[0]).to.equal('B')
        expect(() => heappush([1], 'x')).to.throw(TypeError)
    })

    it('has the Python 3.14 max-heap functions', () => {
        const h = [3, 1, 4, 1, 5]
        heapify_max(h)
        expect(isMaxHeap(h)).to.equal(true)
        heappush_max(h, 9)
        expect(h[0]).to.equal(9)
        expect(heappop_max(h)).to.equal(9)
        expect(heapreplace_max(h, 0)).to.equal(5)
        expect(heappushpop_max(h, 10)).to.equal(10)
        expect(heappushpop_max(h, 2)).to.equal(4)
        expect(isMaxHeap(h)).to.equal(true)
        const out = []
        while (h.length) {
            out.push(heappop_max(h))
        }
        expect(out).to.deep.equal([3, 2, 1, 1, 0])
        expect(() => heappop_max([])).to.throw(IndexError)
    })

    it('finds the n largest and smallest, stably', () => {
        const xs = [5, 1, 8, 3, 8, 2]
        expect(nlargest(3, xs)).to.deep.equal([8, 8, 5])
        expect(nsmallest(2, xs)).to.deep.equal([1, 2])
        const words = ['bb', 'a', 'cc', 'd', 'ee']
        expect(nlargest(2, words, (w) => w.length)).to.deep.equal(['bb', 'cc'])
        expect(nsmallest(2, new Set(words), (w) => w.length)).to.deep.equal(['a', 'd'])
        function* gen() {
            yield* [4, 2, 9, 2]
        }
        expect(nsmallest(3, gen())).to.deep.equal([2, 2, 4])
        expect(nlargest(0, xs)).to.deep.equal([])
        expect(nlargest(1, [])).to.deep.equal([])
    })

    it('merges sorted iterables lazily', () => {
        const merged = merge([1, 4, 7], [2, 5], [3, 6, 9])
        expect(merged.next().value).to.equal(1)
        expect([...merged]).to.deep.equal([2, 3, 4, 5, 6, 7, 9])
        expect([...merge([3, 1], [2], {reverse: true})]).to.deep.equal([3, 2, 1])
        expect([...merge(['a1', 'b1'], ['a2'], {key: (s) => s[0]})]).to.deep.equal(['a1', 'a2', 'b1'])
        expect([...merge()]).to.deep.equal([])
    })
})
