import {expect} from 'chai'
import {equals, IndexError, len, list, Range, range, repr, ValueError} from 'pythonicjs'

describe('range', () => {
    it('is lazy, so huge ranges are cheap', () => {
        const r = range(1e15)
        expect(r.length).to.equal(1e15)
        expect(r.at(-1)).to.equal(1e15 - 1)
        expect(r.includes(123456789)).to.be.true
    })

    it('matches Python for steps and negative indexes', () => {
        const r = range(10, 0, -3)
        expect([...r]).to.deep.equal([10, 7, 4, 1])
        expect(len(r)).to.equal(4)
        expect(r.at(0)).to.equal(10)
        expect(r.at(-1)).to.equal(1)
        expect(r.at(4)).to.equal(undefined)
        expect(r.at(1.5)).to.equal(undefined)
    })

    it('supports membership, index and count like Python', () => {
        const r = range(0, 20, 5)
        expect(r.includes(15)).to.be.true
        expect(r.includes(16)).to.be.false
        expect(r.includes('5')).to.be.false
        expect(r.indexOf(10)).to.equal(2)
        expect(r.indexOf(25)).to.equal(-1)
        expect(r.index(5)).to.equal(1)
        expect(() => r.index(7)).to.throw(ValueError, '7 is not in range')
        expect(r.count(5)).to.equal(1)
        expect(r.count(6)).to.equal(0)
    })

    it('has array-style helpers', () => {
        const r = range(1, 6)
        expect(r.map((x, i) => x * i)).to.deep.equal([0, 2, 6, 12, 20])
        expect(r.filter((x) => x % 2)).to.deep.equal([1, 3, 5])
        expect(r.reduce((a, b) => a + b, 0)).to.equal(15)
        expect(r.some((x) => x > 4)).to.be.true
        expect(r.some((x) => x > 5)).to.be.false
        expect(r.every((x) => x > 0)).to.be.true
        expect(r.every((x) => x > 1)).to.be.false
        expect(r.find((x) => x > 2)).to.equal(3)
        expect(r.find((x) => x > 9)).to.equal(undefined)
        expect(r.join('-')).to.equal('1-2-3-4-5')
        expect(r.join()).to.equal('1,2,3,4,5')
        const seen = []
        r.forEach((x, i) => {
            seen.push([i, x])
        })
        expect(seen[4]).to.deep.equal([4, 5])
    })

    it('slices and reverses into new ranges', () => {
        expect(range(10).slice(2, 8, 2).toString()).to.equal('range(2, 8, 2)')
        expect(list(range(10).slice(null, null, -3))).to.deep.equal([9, 6, 3, 0])
        expect(list(range(5).reverse())).to.deep.equal([4, 3, 2, 1, 0])
    })

    it('prints, serializes and compares like Python', () => {
        expect(String(range(3))).to.equal('range(0, 3)')
        expect(repr(range(0, 9, 3))).to.equal('range(0, 9, 3)')
        expect(JSON.stringify({r: range(3)})).to.equal('{"r":[0,1,2]}')
        expect(range(3).toArray()).to.deep.equal([0, 1, 2])
        expect(equals(range(0), range(4, 2))).to.be.true
        expect(equals(range(3), range(0, 3, 1))).to.be.true
        expect(equals(range(3), [0, 1, 2])).to.be.false
        expect(range(3)).to.be.instanceOf(Range)
    })

    it('rejects bad arguments like Python', () => {
        expect(() => range(0, 5, 0)).to.throw(ValueError, 'must not be zero')
        expect(() => range(1.5)).to.throw(TypeError)
        expect(() => range(10).slice(0, 5, 0)).to.throw(ValueError)
        expect(IndexError).to.be.a('function')
    })
})
