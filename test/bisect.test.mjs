import {expect} from 'chai'
import {bisect as ns, ValueError} from 'pythonicjs'
import {bisect, bisect_left, bisect_right, insort, insort_left, insort_right} from 'pythonicjs/bisect'

describe('bisect', () => {
    it('is exposed as a namespace and a subpath', () => {
        expect(ns.bisect_left).to.equal(bisect_left)
        expect(bisect).to.equal(bisect_right)
        expect(insort).to.equal(insort_right)
    })

    it('finds insertion points around equal items', () => {
        const a = [1, 2, 2, 2, 3]
        expect(bisect_left(a, 2)).to.equal(1)
        expect(bisect_right(a, 2)).to.equal(4)
        expect(bisect_left(a, 0)).to.equal(0)
        expect(bisect_right(a, 9)).to.equal(5)
    })

    it('takes lo and hi positionally or as options', () => {
        const a = [1, 2, 2, 2, 3]
        expect(bisect_left(a, 2, 2)).to.equal(2)
        expect(bisect_right(a, 2, 0, 3)).to.equal(3)
        expect(bisect_right(a, 2, {hi: 3})).to.equal(3)
        expect(bisect_left(a, 2, {lo: 2})).to.equal(2)
        expect(() => bisect_left(a, 2, -1)).to.throw(ValueError, 'lo must be non-negative')
    })

    it('applies key to items but not to x when searching', () => {
        const people = [
            ['ann', 20],
            ['bob', 30],
            ['cy', 30],
            ['dee', 40],
        ]
        const age = (p) => p[1]
        expect(bisect_left(people, 30, 0, null, age)).to.equal(1)
        expect(bisect_right(people, 30, {key: age})).to.equal(3)
    })

    it('applies key to x when inserting', () => {
        const people = [
            ['ann', 20],
            ['bob', 30],
        ]
        insort_left(people, ['eve', 30], {key: (p) => p[1]})
        insort_right(people, ['fay', 30], 0, undefined, (p) => p[1])
        expect(people.map((p) => p[0])).to.deep.equal(['ann', 'eve', 'bob', 'fay'])
    })

    it('inserts in place with Python ordering', () => {
        const a = []
        for (const x of ['b', 'B', 'a', 'é']) {
            insort(a, x)
        }
        expect(a).to.deep.equal(['B', 'a', 'b', 'é'])
        const t = [
            [1, 'a'],
            [2, 'b'],
        ]
        insort(t, [1, 'b'])
        expect(t).to.deep.equal([
            [1, 'a'],
            [1, 'b'],
            [2, 'b'],
        ])
    })
})
