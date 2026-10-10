import {expect} from 'chai'
import {itertools, ValueError} from 'pythonicjs'
import {
    accumulate,
    batched,
    chain,
    combinations,
    count,
    cycle,
    groupby,
    islice,
    nth,
    permutations,
    product,
    repeat,
    take,
    tee,
    zip_longest,
} from 'pythonicjs/itertools'

const isLazyIterator = (it) =>
    typeof it.next === 'function' &&
    typeof it[Symbol.iterator] === 'function' &&
    it[Symbol.iterator]() === it &&
    !Array.isArray(it)

describe('itertools', () => {
    it('is exposed as a namespace and as a subpath module', () => {
        expect(itertools.combinations).to.equal(combinations)
        expect(itertools.chain.from_iterable).to.be.a('function')
    })

    it('returns lazy iterators, never arrays', () => {
        const made = [
            count(),
            cycle([1]),
            repeat(1),
            accumulate([1]),
            batched([1], 1),
            chain([1]),
            chain.from_iterable([[1]]),
            groupby([1]),
            islice([1], 1),
            product([1]),
            permutations([1]),
            combinations([1], 1),
            zip_longest([1]),
            itertools.compress([1], [1]),
            itertools.dropwhile(() => false, [1]),
            itertools.takewhile(() => true, [1]),
            itertools.filterfalse(null, [0]),
            itertools.pairwise([1, 2]),
            itertools.starmap(Math.max, [[1, 2]]),
            itertools.combinations_with_replacement([1], 1),
            itertools.unique_everseen([1]),
            itertools.sliding_window([1, 2], 2),
            itertools.roundrobin([1]),
            ...tee([1]),
            ...itertools.partition(Boolean, [1]),
        ]
        for (const it of made) {
            expect(isLazyIterator(it)).to.equal(true)
        }
    })

    it('works with infinite iterators', () => {
        expect(take(5, count(10, 5))).to.deep.equal([10, 15, 20, 25, 30])
        expect([...islice(cycle('ab'), 5)]).to.deep.equal(['a', 'b', 'a', 'b', 'a'])
        expect(take(3, repeat('x'))).to.deep.equal(['x', 'x', 'x'])
        expect(nth(count(), 1000)).to.equal(1000)
        expect(take(3, accumulate(count(1)))).to.deep.equal([1, 3, 6])
        expect(take(2, zip_longest(count(), 'a'))).to.deep.equal([
            [0, 'a'],
            [1, undefined],
        ])
        expect(take(2, batched(count(), 2))).to.deep.equal([
            [0, 1],
            [2, 3],
        ])
        const [a, b] = tee(count())
        expect(take(3, a)).to.deep.equal([0, 1, 2])
        expect(take(2, b)).to.deep.equal([0, 1])
    })

    it('does not build combinatoric output up front', () => {
        // 30! permutations and 2^60 products could never be materialised
        const perms = permutations(Array.from({length: 30}, (_, i) => i))
        expect(perms.next().value.slice(-3)).to.deep.equal([27, 28, 29])
        expect(perms.next().value.slice(-3)).to.deep.equal([27, 29, 28])
        expect(product([0, 1], {repeat: 60}).next().value).to.have.length(60)
        expect(
            take(
                2,
                combinations(
                    Array.from({length: 60}, (_, i) => i),
                    30,
                ),
            ),
        ).to.have.length(2)
    })

    it('reads its inputs lazily', () => {
        let pulled = 0
        function* source() {
            while (true) {
                pulled++
                yield pulled
            }
        }
        const it = islice(chain(source()), 2, 4)
        expect(pulled).to.equal(0)
        expect([...it]).to.deep.equal([3, 4])
        expect(pulled).to.equal(4)
    })

    it('checks arguments eagerly, like CPython', () => {
        expect(() => islice([1], -1)).to.throw(
            ValueError,
            'Stop argument for islice() must be None or an integer: 0 <= x <= sys.maxsize.',
        )
        expect(() => islice([1], -1, 2)).to.throw(
            ValueError,
            'Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.',
        )
        expect(() => islice([1], 0, 2, 0)).to.throw(ValueError, 'Step for islice() must be a positive integer or None.')
        expect(() => combinations([1], -1)).to.throw(ValueError, 'r must be non-negative')
        expect(() => batched([1], 0)).to.throw(ValueError, 'n must be at least one')
        expect(() => chain.from_iterable(5)).to.throw(TypeError, "'int' object is not iterable")
        expect(() => count('a')).to.throw(TypeError)
        expect(() => [...batched([1, 2, 3], 2, {strict: true})]).to.throw(ValueError, 'batched(): incomplete batch')
    })

    it('uses JavaScript-friendly defaults', () => {
        expect([...zip_longest([1, 2], ['a'])]).to.deep.equal([
            [1, 'a'],
            [2, undefined],
        ])
        expect([...zip_longest([1, 2], ['a'], {fillvalue: '-'})]).to.deep.equal([
            [1, 'a'],
            [2, '-'],
        ])
        expect(tee([1])).to.have.length(2)
        expect(tee([1], 0)).to.deep.equal([])
        expect(nth([1], 5)).to.equal(undefined)
        expect(nth([1], 5, 'none')).to.equal('none')
        expect(itertools.first_true([0, ''])).to.equal(false)
        expect([...accumulate([1, 2, 3], null, 10)]).to.deep.equal([10, 11, 13, 16])
        expect([...accumulate([1, 2, 3], {initial: 10})]).to.deep.equal([10, 11, 13, 16])
        expect([...accumulate([1, 2, 3], (a, b) => a * b, {initial: 2})]).to.deep.equal([2, 2, 4, 12])
        expect([...accumulate(['a', 'b'])]).to.deep.equal(['a', 'ab'])
        expect([...product('ab', [1])]).to.deep.equal([
            ['a', 1],
            ['b', 1],
        ])
        expect([...permutations([1, 2, 3], null)]).to.have.length(6)
        expect([...islice(count(1n, 2n), 2)]).to.deep.equal([1n, 3n])
    })

    it('ends a group when groupby moves on', () => {
        const gb = groupby('aabbb')
        const [k1, g1] = gb.next().value
        expect(k1).to.equal('a')
        expect(g1.next().value).to.equal('a')
        const [k2, g2] = gb.next().value
        expect(k2).to.equal('b')
        expect([...g1]).to.deep.equal([])
        expect([...g2]).to.deep.equal(['b', 'b', 'b'])
        expect(gb.next().done).to.equal(true)
    })

    it('chains lazily and flattens one level', () => {
        expect([...chain('ab', [1, 2])]).to.deep.equal(['a', 'b', 1, 2])
        expect([...chain.from_iterable([[1], [[2]]])]).to.deep.equal([1, [2]])
    })

    it('keeps the recipes working', () => {
        expect([...itertools.unique_everseen('AAAABBBCCDAABBB')]).to.deep.equal(['A', 'B', 'C', 'D'])
        expect([...itertools.sliding_window('ABCD', 2)].map((w) => w.join(''))).to.deep.equal(['AB', 'BC', 'CD'])
        expect([...itertools.roundrobin('ABC', 'D', 'EF')].join('')).to.equal('ADEBFC')
        const [evens, odds] = itertools.partition((x) => x & 1, [0, 1, 2, 3, 4])
        expect([...evens]).to.deep.equal([0, 2, 4])
        expect([...odds]).to.deep.equal([1, 3])
        expect(itertools.quantify([0, 1, [], [0], ''])).to.equal(2)
    })
})
