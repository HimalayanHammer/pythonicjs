/**
 * Python's itertools as lazy generators, plus the best-known recipes from
 * the itertools documentation (take, nth, first_true, unique_everseen,
 * sliding_window, roundrobin, partition, quantify).
 *
 *   import {itertools} from 'pythonicjs'
 *   import {combinations, islice, count} from 'pythonicjs/itertools'
 *
 * Every function returns an IterableIterator (a generator) that produces its
 * items on demand, in the same order as CPython. Arguments are checked when
 * the function is called and inputs are turned into iterators right away, so
 * errors show up at the same point as in Python. Python tuples are arrays,
 * and a None default becomes undefined.
 */

import {bool} from './builtins.js'
import {ValueError} from './errors.js'
import {equals, isIterable, isPlainObject, type Key, typeName} from './internal.js'

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

/** The item type of an iterable. */
export type ElementOf<I> = I extends Iterable<infer U> ? U : never

/** The item types of several iterables, as a tuple. */
export type Elements<T extends readonly unknown[]> = {[K in keyof T]: ElementOf<T[K]>}

/**
 * A tuple of N items of type T when N is a non-negative integer literal up
 * to 64 (combinations(xs, 2) gives [T, T]); T[] otherwise.
 */
export type TupleOf<T, N extends number, Acc extends T[] = []> = number extends N
    ? T[]
    : `${N}` extends `-${string}` | `${string}.${string}` | `${string}e${string}`
      ? T[]
      : Acc['length'] extends N
        ? Acc
        : Acc['length'] extends 64
          ? T[]
          : TupleOf<T, N, [...Acc, T]>

type Predicate<T> = (item: T) => unknown

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function getIter<T>(iterable: Iterable<T>): Iterator<T> {
    if (!isIterable(iterable)) {
        throw new TypeError(`'${typeName(iterable)}' object is not iterable`)
    }
    return iterable[Symbol.iterator]()
}

/** A plain Iterator as an iterable generator. */
function* wrap<T>(it: Iterator<T>): Generator<T, void, undefined> {
    for (let r = it.next(); !r.done; r = it.next()) {
        yield r.value
    }
}

/** An integer argument as a number (booleans and BigInts count, like Python ints). */
function asInt(value: unknown): number {
    if (typeof value === 'boolean' || typeof value === 'bigint') {
        return Number(value)
    }
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value
    }
    throw new TypeError(`'${typeName(value)}' object cannot be interpreted as an integer`)
}

/** PyNumber_AsSsize_t as islice() uses it: -1 for anything that is not a usable index. */
function asSsize(value: unknown): number {
    try {
        const n = asInt(value)
        return Math.abs(n) > 2 ** 63 - 1 ? -1 : n
    } catch {
        return -1
    }
}

/** Python's a + b (operator.add) for numbers, BigInts, strings and arrays (tuples). */
function add(a: unknown, b: unknown): unknown {
    const x = typeof a === 'boolean' ? Number(a) : a
    const y = typeof b === 'boolean' ? Number(b) : b
    if (typeof x === 'number' && typeof y === 'number') {
        return x + y
    }
    if (typeof x === 'bigint' && typeof y === 'bigint') {
        return x + y
    }
    if ((typeof x === 'bigint' && typeof y === 'number') || (typeof x === 'number' && typeof y === 'bigint')) {
        return Number.isInteger(Number(x)) && Number.isInteger(Number(y)) ? BigInt(x) + BigInt(y) : Number(x) + Number(y)
    }
    if (typeof x === 'string' && typeof y === 'string') {
        return x + y
    }
    if (Array.isArray(x) && Array.isArray(y)) {
        return [...x, ...y]
    }
    const custom = (x as {__add__?: (other: unknown) => unknown} | null)?.__add__
    if (typeof custom === 'function') {
        return custom.call(x, y)
    }
    throw new TypeError(`unsupported operand type(s) for +: '${typeName(a)}' and '${typeName(b)}'`)
}

function isNumber(x: unknown): boolean {
    return typeof x === 'number' || typeof x === 'bigint' || typeof x === 'boolean'
}

/** Python-ish hash key for primitives: true == 1 == 1n, like Python's set and ==. */
function hashable(x: unknown): unknown {
    if (typeof x === 'boolean') {
        return Number(x)
    }
    if (typeof x === 'bigint' && x >= BigInt(Number.MIN_SAFE_INTEGER) && x <= BigInt(Number.MAX_SAFE_INTEGER)) {
        return Number(x)
    }
    return x
}

/** Python's == between keys. */
function keyEquals(a: unknown, b: unknown): boolean {
    return equals(hashable(a), hashable(b))
}

/** Splits a trailing options object off a rest-argument list. */
function splitOptions(args: unknown[]): [unknown[], Record<string, unknown>] {
    const last = args[args.length - 1]
    if (args.length > 0 && isPlainObject(last)) {
        return [args.slice(0, -1), last]
    }
    return [args, {}]
}

function* lazyFilter<T>(predicate: Predicate<T> | null | undefined, it: Iterator<T>, keep: boolean): Generator<T, void, undefined> {
    const test = predicate ?? bool
    for (let r = it.next(); !r.done; r = it.next()) {
        if (bool(test(r.value)) === keep) {
            yield r.value
        }
    }
}

// ---------------------------------------------------------------------------
// infinite iterators
// ---------------------------------------------------------------------------

/** start, start + step, start + 2 * step, ... forever (floats accumulate by repeated addition, like CPython). */
export function count(start?: number, step?: number): IterableIterator<number>
export function count(start: bigint, step?: bigint): IterableIterator<bigint>
export function count(start: unknown = 0, step: unknown = 1): IterableIterator<unknown> {
    if (!isNumber(start) || !isNumber(step)) {
        throw new TypeError('a number is required')
    }
    return countGen(typeof start === 'boolean' ? Number(start) : start, typeof step === 'boolean' ? Number(step) : step)
}

function* countGen(start: unknown, step: unknown): Generator<unknown, void, undefined> {
    let n = start
    while (true) {
        yield n
        n = add(n, step)
    }
}

/** The items of the iterable, then the same items again, forever (it saves a copy, like CPython). */
export function cycle<T>(iterable: Iterable<T>): IterableIterator<T> {
    return cycleGen(getIter(iterable))
}

function* cycleGen<T>(it: Iterator<T>): Generator<T, void, undefined> {
    const saved: T[] = []
    for (let r = it.next(); !r.done; r = it.next()) {
        saved.push(r.value)
        yield r.value
    }
    if (saved.length === 0) {
        return
    }
    while (true) {
        yield* saved
    }
}

/** The object over and over: forever, or `times` times (a negative count gives nothing). */
export function repeat<T>(object: T, times?: number): IterableIterator<T> {
    return repeatGen(object, times === undefined ? Number.POSITIVE_INFINITY : asInt(times))
}

function* repeatGen<T>(object: T, times: number): Generator<T, void, undefined> {
    for (let i = 0; i < times; i++) {
        yield object
    }
}

// ---------------------------------------------------------------------------
// iterators terminating on the shortest input
// ---------------------------------------------------------------------------

/** Options for accumulate(). */
export interface AccumulateOptions<U> {
    initial?: U | null
}

/**
 * Running totals (or running results of func). The initial value can be the
 * third argument or {initial} (second or third); null or undefined means no
 * initial value, like Python's initial=None. The default func is Python's +
 * (numbers add, strings and arrays concatenate).
 */
export function accumulate<T>(iterable: Iterable<T>, func?: ((total: T, item: T) => T) | null): IterableIterator<T>
export function accumulate<T>(iterable: Iterable<T>, options: AccumulateOptions<T>): IterableIterator<T>
export function accumulate<T, U>(
    iterable: Iterable<T>,
    func: ((total: U, item: T) => U) | null | undefined,
    options: AccumulateOptions<U>,
): IterableIterator<U>
export function accumulate<T, U>(iterable: Iterable<T>, func: ((total: U, item: T) => U) | null | undefined, initial: U): IterableIterator<U>
export function accumulate(iterable: Iterable<unknown>, func?: unknown, initial?: unknown): IterableIterator<unknown> {
    let fn = func
    let init = initial
    if (isPlainObject(fn) && init === undefined) {
        init = fn.initial
        fn = null
    } else if (isPlainObject(init) && Object.keys(init).length === 1 && 'initial' in init) {
        init = init.initial
    }
    if (fn !== null && fn !== undefined && typeof fn !== 'function') {
        throw new TypeError(`'${typeName(fn)}' object is not callable`)
    }
    const it = getIter(iterable)
    return accumulateGen(it, (fn as ((a: unknown, b: unknown) => unknown) | null | undefined) ?? add, init ?? null)
}

function* accumulateGen(it: Iterator<unknown>, fn: (a: unknown, b: unknown) => unknown, initial: unknown): Generator<unknown, void, undefined> {
    let total: unknown
    let started = false
    if (initial !== null) {
        total = initial
        started = true
        yield total
    }
    for (let r = it.next(); !r.done; r = it.next()) {
        total = started ? fn(total, r.value) : r.value
        started = true
        yield total
    }
}

/** Options for batched(). */
export interface BatchedOptions {
    /** Raise ValueError if the last batch is short (Python 3.13). */
    strict?: boolean
}

/** Arrays of n items; the last one may be shorter unless {strict: true}. */
export function batched<T>(iterable: Iterable<T>, n: number, options: BatchedOptions = {}): IterableIterator<T[]> {
    const size = asInt(n)
    if (size < 1) {
        throw new ValueError('n must be at least one')
    }
    return batchedGen(getIter(iterable), size, Boolean(options?.strict))
}

function* batchedGen<T>(it: Iterator<T>, n: number, strict: boolean): Generator<T[], void, undefined> {
    while (true) {
        const batch: T[] = []
        while (batch.length < n) {
            const r = it.next()
            if (r.done) {
                break
            }
            batch.push(r.value)
        }
        if (batch.length === 0) {
            return
        }
        if (batch.length < n) {
            if (strict) {
                throw new ValueError('batched(): incomplete batch')
            }
            yield batch
            return
        }
        yield batch
    }
}

/** The items of each iterable in turn. chain.from_iterable(xss) reads the iterables lazily from one iterable. */
export function chain<T extends Iterable<unknown>[]>(...iterables: T): IterableIterator<ElementOf<T[number]>> {
    return chainGen(iterables[Symbol.iterator]()) as IterableIterator<ElementOf<T[number]>>
}

/** Like chain(...iterables), but takes the iterables lazily from one iterable. */
chain.from_iterable = function from_iterable<T>(iterables: Iterable<Iterable<T>>): IterableIterator<T> {
    return chainGen(getIter(iterables))
}

function* chainGen<T>(sources: Iterator<Iterable<T>>): Generator<T, void, undefined> {
    for (let r = sources.next(); !r.done; r = sources.next()) {
        yield* wrap(getIter(r.value))
    }
}

/** The items of data whose matching selector is truthy; stops when either runs out. */
export function compress<T>(data: Iterable<T>, selectors: Iterable<unknown>): IterableIterator<T> {
    return compressGen(getIter(data), getIter(selectors))
}

function* compressGen<T>(data: Iterator<T>, selectors: Iterator<unknown>): Generator<T, void, undefined> {
    while (true) {
        const d = data.next()
        if (d.done) {
            return
        }
        const s = selectors.next()
        if (s.done) {
            return
        }
        if (bool(s.value)) {
            yield d.value
        }
    }
}

/** Skips items while predicate is truthy, then yields everything after. */
export function dropwhile<T>(predicate: Predicate<T>, iterable: Iterable<T>): IterableIterator<T> {
    return dropwhileGen(predicate, getIter(iterable))
}

function* dropwhileGen<T>(predicate: Predicate<T>, it: Iterator<T>): Generator<T, void, undefined> {
    for (let r = it.next(); !r.done; r = it.next()) {
        if (!bool(predicate(r.value))) {
            yield r.value
            yield* wrap(it)
            return
        }
    }
}

/** The items where predicate is falsy; with null, the falsy items (Python truthiness). */
export function filterfalse<T>(predicate: Predicate<T> | null, iterable: Iterable<T>): IterableIterator<T> {
    return lazyFilter(predicate, getIter(iterable), false)
}

const NONE: unique symbol = Symbol('none')

interface GroupState {
    it: Iterator<unknown>
    key: (item: unknown) => unknown
    tgtkey: unknown
    currkey: unknown
    currvalue: unknown
    id: object
}

/**
 * [key, group] pairs for runs of consecutive items with the same key. The
 * groups share the underlying iterator with groupby itself: advancing to the
 * next pair ends the previous group, exactly like CPython.
 */
export function groupby<T>(iterable: Iterable<T>, key?: null): IterableIterator<[T, IterableIterator<T>]>
export function groupby<T, K>(iterable: Iterable<T>, key: (item: T) => K): IterableIterator<[K, IterableIterator<T>]>
export function groupby(iterable: Iterable<unknown>, key?: Key<unknown>): IterableIterator<[unknown, IterableIterator<unknown>]> {
    const state: GroupState = {
        it: getIter(iterable),
        key: key ?? ((x) => x),
        tgtkey: NONE,
        currkey: NONE,
        currvalue: NONE,
        id: {},
    }
    return groupbyGen(state)
}

function* groupbyGen(s: GroupState): Generator<[unknown, IterableIterator<unknown>], void, undefined> {
    while (true) {
        s.id = {}
        while (keyEquals(s.currkey, s.tgtkey)) {
            const r = s.it.next()
            if (r.done) {
                return
            }
            s.currvalue = r.value
            s.currkey = s.key(r.value)
        }
        s.tgtkey = s.currkey
        yield [s.currkey, grouper(s, s.tgtkey, s.id)]
    }
}

// Port of CPython's _grouper_next: check that this group is still current
// before reading ahead, and read the next item only when asked for one.
function* grouper(s: GroupState, tgtkey: unknown, id: object): Generator<unknown, void, undefined> {
    while (s.id === id) {
        if (s.currvalue === NONE) {
            const r = s.it.next()
            if (r.done) {
                return
            }
            s.currvalue = r.value
            s.currkey = s.key(r.value)
        }
        if (!keyEquals(tgtkey, s.currkey)) {
            return
        }
        const value = s.currvalue
        s.currvalue = NONE
        yield value
    }
}

/**
 * Lazy slicing: islice(xs, stop) or islice(xs, start, stop, step), where null
 * means None. Negative values raise ValueError. It consumes exactly the items
 * CPython consumes, so the rest of a shared iterator stays usable.
 */
export function islice<T>(iterable: Iterable<T>, stop: number | null): IterableIterator<T>
export function islice<T>(iterable: Iterable<T>, start: number | null, stop: number | null, step?: number | null): IterableIterator<T>
export function islice<T>(iterable: Iterable<T>, ...args: (number | null | undefined)[]): IterableIterator<T> {
    if (args.length < 1 || args.length > 3) {
        throw new TypeError(`islice expected 2 to 4 arguments, got ${args.length + 1}`)
    }
    const stopError = 'Stop argument for islice() must be None or an integer: 0 <= x <= sys.maxsize.'
    const isNone = (x: unknown) => x === null || x === undefined
    let start = 0
    let stop = -1
    let step = 1
    if (args.length === 1) {
        if (!isNone(args[0])) {
            stop = asSsize(args[0])
            if (stop === -1) {
                throw new ValueError(stopError)
            }
        }
    } else {
        if (!isNone(args[0])) {
            start = asSsize(args[0])
        }
        if (!isNone(args[1])) {
            stop = asSsize(args[1])
            if (stop === -1) {
                throw new ValueError(stopError)
            }
        }
    }
    if (start < 0 || stop < -1) {
        throw new ValueError('Indices for islice() must be None or an integer: 0 <= x <= sys.maxsize.')
    }
    if (args.length === 3 && !isNone(args[2])) {
        step = asSsize(args[2])
    }
    if (step < 1) {
        throw new ValueError('Step for islice() must be a positive integer or None.')
    }
    return isliceGen(getIter(iterable), start, stop, step)
}

function* isliceGen<T>(it: Iterator<T>, start: number, stop: number, step: number): Generator<T, void, undefined> {
    let next = start
    let cnt = 0
    while (true) {
        while (cnt < next) {
            if (it.next().done) {
                return
            }
            cnt++
        }
        if (stop !== -1 && cnt >= stop) {
            return
        }
        const r = it.next()
        if (r.done) {
            return
        }
        cnt++
        next += step
        if (stop !== -1 && next > stop) {
            next = stop
        }
        yield r.value
    }
}

/** Overlapping pairs: pairwise('ABCD') gives AB, BC, CD. */
export function pairwise<T>(iterable: Iterable<T>): IterableIterator<[T, T]> {
    return pairwiseGen(getIter(iterable))
}

function* pairwiseGen<T>(it: Iterator<T>): Generator<[T, T], void, undefined> {
    const first = it.next()
    if (first.done) {
        return
    }
    let old = first.value
    for (let r = it.next(); !r.done; r = it.next()) {
        yield [old, r.value]
        old = r.value
    }
}

/** Calls func(...args) for each args array of the iterable. */
export function starmap<A extends unknown[], R>(func: (...args: A) => R, iterable: Iterable<A>): IterableIterator<R> {
    return starmapGen(func, getIter(iterable))
}

function* starmapGen<A extends unknown[], R>(func: (...args: A) => R, it: Iterator<A>): Generator<R, void, undefined> {
    for (let r = it.next(); !r.done; r = it.next()) {
        yield func(...(Array.from(wrap(getIter(r.value))) as A))
    }
}

/** Items while predicate is truthy; stops at (and consumes) the first falsy one. */
export function takewhile<T>(predicate: Predicate<T>, iterable: Iterable<T>): IterableIterator<T> {
    return takewhileGen(predicate, getIter(iterable))
}

function* takewhileGen<T>(predicate: Predicate<T>, it: Iterator<T>): Generator<T, void, undefined> {
    for (let r = it.next(); !r.done; r = it.next()) {
        if (!bool(predicate(r.value))) {
            return
        }
        yield r.value
    }
}

interface TeeState<T> {
    it: Iterator<T>
    done: boolean
}

interface TeeLink<T> {
    value?: T
    next: TeeLink<T> | null
}

/** n independent iterators over one iterable, as an array (a tuple type for a literal n); items are buffered until every copy has read them. */
export function tee<T, N extends number = 2>(iterable: Iterable<T>, n?: N): TupleOf<IterableIterator<T>, N> {
    const copies = n === undefined ? 2 : asInt(n)
    if (copies < 0) {
        throw new ValueError('n must be >= 0')
    }
    const state: TeeState<T> = {it: getIter(iterable), done: false}
    const head: TeeLink<T> = {next: null}
    const result: IterableIterator<T>[] = []
    for (let i = 0; i < copies; i++) {
        result.push(teeGen(state, head))
    }
    return result as TupleOf<IterableIterator<T>, N>
}

function* teeGen<T>(state: TeeState<T>, node: TeeLink<T>): Generator<T, void, undefined> {
    while (true) {
        if (node.next === null) {
            if (state.done) {
                return
            }
            const r = state.it.next()
            if (r.done) {
                state.done = true
                return
            }
            node.next = {value: r.value, next: null}
        }
        node = node.next
        yield node.value as T
    }
}

/** Options for zip_longest(). */
export interface ZipLongestOptions<F> {
    fillvalue: F
}

/**
 * Groups items by position until the longest input runs out, filling the
 * gaps with {fillvalue} (undefined by default, where Python uses None).
 */
export function zip_longest<T extends Iterable<unknown>[]>(...iterables: T): IterableIterator<{[K in keyof T]: ElementOf<T[K]> | undefined}>
export function zip_longest<T extends Iterable<unknown>[], F>(
    ...args: [...T, ZipLongestOptions<F>]
): IterableIterator<{[K in keyof T]: ElementOf<T[K]> | F}>
export function zip_longest(...args: unknown[]): IterableIterator<unknown[]> {
    const [iterables, options] = splitOptions(args)
    const its = iterables.map((x) => getIter(x as Iterable<unknown>))
    return zipLongestGen(its, options.fillvalue)
}

function* zipLongestGen(its: (Iterator<unknown> | null)[], fill: unknown): Generator<unknown[], void, undefined> {
    let active = its.length
    if (active === 0) {
        return
    }
    while (true) {
        const items: unknown[] = []
        for (let i = 0; i < its.length; i++) {
            const it = its[i]
            if (it === null) {
                items.push(fill)
                continue
            }
            const r = it.next()
            if (r.done) {
                active--
                if (active === 0) {
                    return
                }
                its[i] = null
                items.push(fill)
            } else {
                items.push(r.value)
            }
        }
        yield items
    }
}

// ---------------------------------------------------------------------------
// combinatoric iterators
// ---------------------------------------------------------------------------

/** Options for product(). */
export interface ProductOptions {
    repeat?: number
}

/**
 * The Cartesian product, as arrays, in the same order as nested for-loops.
 * Pass {repeat: n} last to use the inputs n times. The inputs are read
 * eagerly (like CPython); the output is lazy.
 */
export function product<T extends Iterable<unknown>[]>(...iterables: T): IterableIterator<Elements<T>>
export function product<T extends Iterable<unknown>[]>(...args: [...T, ProductOptions]): IterableIterator<ElementOf<T[number]>[]>
export function product(...args: unknown[]): IterableIterator<unknown[]> {
    const [iterables, options] = splitOptions(args)
    const times = options.repeat === undefined ? 1 : asInt(options.repeat)
    if (times < 0) {
        throw new ValueError('repeat argument cannot be negative')
    }
    const pools = iterables.map((x) => Array.from(wrap(getIter(x as Iterable<unknown>))))
    const all: unknown[][] = []
    for (let i = 0; i < times; i++) {
        all.push(...pools)
    }
    return productGen(all)
}

function* productGen(pools: unknown[][]): Generator<unknown[], void, undefined> {
    if (pools.some((pool) => pool.length === 0)) {
        return
    }
    const n = pools.length
    const indices = new Array<number>(n).fill(0)
    yield pools.map((pool) => pool[0])
    while (true) {
        let i = n - 1
        while (i >= 0 && indices[i] === pools[i].length - 1) {
            indices[i] = 0
            i--
        }
        if (i < 0) {
            return
        }
        indices[i]++
        yield indices.map((j, k) => pools[k][j])
    }
}

/** Successive r-length orderings of the items (all of them when r is omitted), in CPython's order. */
export function permutations<T, R extends number = number>(iterable: Iterable<T>, r?: R | null): IterableIterator<TupleOf<T, R>> {
    const pool = Array.from(wrap(getIter(iterable)))
    const size = r === undefined || r === null ? pool.length : asInt(r)
    if (size < 0) {
        throw new ValueError('r must be non-negative')
    }
    return permutationsGen(pool, size) as IterableIterator<TupleOf<T, R>>
}

function* permutationsGen<T>(pool: T[], r: number): Generator<T[], void, undefined> {
    const n = pool.length
    if (r > n) {
        return
    }
    const indices = Array.from({length: n}, (_, i) => i)
    const cycles = Array.from({length: r}, (_, i) => n - i)
    yield indices.slice(0, r).map((i) => pool[i])
    if (n === 0) {
        return
    }
    while (true) {
        let i = r - 1
        for (; i >= 0; i--) {
            cycles[i]--
            if (cycles[i] === 0) {
                const [moved] = indices.splice(i, 1)
                indices.push(moved)
                cycles[i] = n - i
            } else {
                const k = n - cycles[i]
                ;[indices[i], indices[k]] = [indices[k], indices[i]]
                yield indices.slice(0, r).map((x) => pool[x])
                break
            }
        }
        if (i < 0) {
            return
        }
    }
}

/** r-length subsequences in sorted-position order, without repeats. */
export function combinations<T, R extends number>(iterable: Iterable<T>, r: R): IterableIterator<TupleOf<T, R>> {
    const size = asInt(r)
    const pool = Array.from(wrap(getIter(iterable)))
    if (size < 0) {
        throw new ValueError('r must be non-negative')
    }
    return combinationsGen(pool, size) as IterableIterator<TupleOf<T, R>>
}

function* combinationsGen<T>(pool: T[], r: number): Generator<T[], void, undefined> {
    const n = pool.length
    if (r > n) {
        return
    }
    const indices = Array.from({length: r}, (_, i) => i)
    yield indices.map((i) => pool[i])
    while (true) {
        let i = r - 1
        while (i >= 0 && indices[i] === i + n - r) {
            i--
        }
        if (i < 0) {
            return
        }
        indices[i]++
        for (let j = i + 1; j < r; j++) {
            indices[j] = indices[j - 1] + 1
        }
        yield indices.map((x) => pool[x])
    }
}

/** r-length subsequences where items may repeat, in sorted-position order. */
export function combinations_with_replacement<T, R extends number>(iterable: Iterable<T>, r: R): IterableIterator<TupleOf<T, R>> {
    const size = asInt(r)
    const pool = Array.from(wrap(getIter(iterable)))
    if (size < 0) {
        throw new ValueError('r must be non-negative')
    }
    return cwrGen(pool, size) as IterableIterator<TupleOf<T, R>>
}

function* cwrGen<T>(pool: T[], r: number): Generator<T[], void, undefined> {
    const n = pool.length
    if (n === 0 && r > 0) {
        return
    }
    const indices = new Array<number>(r).fill(0)
    yield indices.map((i) => pool[i])
    while (true) {
        let i = r - 1
        while (i >= 0 && indices[i] === n - 1) {
            i--
        }
        if (i < 0) {
            return
        }
        const value = indices[i] + 1
        for (let j = i; j < r; j++) {
            indices[j] = value
        }
        yield indices.map((x) => pool[x])
    }
}

// ---------------------------------------------------------------------------
// recipes from the itertools documentation
// ---------------------------------------------------------------------------

/** The first n items as an array (recipe: list(islice(iterable, n))). */
export function take<T>(n: number, iterable: Iterable<T>): T[] {
    return Array.from(islice(iterable, n))
}

/** The item at index n, or the default (undefined where Python uses None). */
export function nth<T, D = undefined>(iterable: Iterable<T>, n: number, defaultValue?: D): T | D {
    const r = islice(iterable, n, null).next()
    return r.done ? (defaultValue as D) : r.value
}

/** The first item for which predicate is truthy (the first truthy item without one), else the default (false). */
export function first_true<T, D = false>(iterable: Iterable<T>, defaultValue: D = false as D, predicate?: Predicate<T> | null): T | D {
    const r = lazyFilter(predicate, getIter(iterable), true).next()
    return r.done ? defaultValue : r.value
}

/**
 * Unique items in order of first appearance, optionally by key. Primitives
 * compare like Python's set (1 == true == 1n); arrays and objects compare by
 * value with equals(), so tuples work and lists do not raise TypeError.
 */
export function unique_everseen<T>(iterable: Iterable<T>, key?: Key<T>): IterableIterator<T> {
    return uniqueGen(getIter(iterable), key ?? null)
}

function* uniqueGen<T>(it: Iterator<T>, key: ((item: T) => unknown) | null): Generator<T, void, undefined> {
    const primitives = new Set<unknown>()
    const objects: unknown[] = []
    for (let r = it.next(); !r.done; r = it.next()) {
        const k = hashable(key === null ? r.value : key(r.value))
        if (k !== null && typeof k === 'object') {
            if (objects.some((o) => equals(o, k))) {
                continue
            }
            objects.push(k)
        } else {
            if (primitives.has(k)) {
                continue
            }
            primitives.add(k)
        }
        yield r.value
    }
}

/** Overlapping windows of n items: sliding_window('ABCDEFG', 4) gives ABCD BCDE CDEF DEFG. */
export function sliding_window<T, N extends number = number>(iterable: Iterable<T>, n: N): IterableIterator<TupleOf<T, N>> {
    return slidingGen(iterable, n) as IterableIterator<TupleOf<T, N>>
}

function* slidingGen<T>(iterable: Iterable<T>, n: number): Generator<T[], void, undefined> {
    const it = wrap(getIter(iterable))
    const window = Array.from(islice(it, n - 1))
    for (const x of it) {
        window.push(x)
        if (window.length > n) {
            window.shift()
        }
        yield window.slice()
    }
}

/** One item from each iterable in turn until all are exhausted: roundrobin('ABC', 'D', 'EF') gives A D E B F C. */
export function roundrobin<T extends Iterable<unknown>[]>(...iterables: T): IterableIterator<ElementOf<T[number]>> {
    return roundrobinGen(iterables) as IterableIterator<ElementOf<T[number]>>
}

function* roundrobinGen(iterables: Iterable<unknown>[]): Generator<unknown, void, undefined> {
    const its = iterables.map((x) => getIter(x))
    let i = 0
    while (its.length > 0) {
        const r = its[i].next()
        if (r.done) {
            its.splice(i, 1)
        } else {
            yield r.value
            i++
        }
        if (i >= its.length) {
            i = 0
        }
    }
}

/** [items where predicate is falsy, items where it is truthy], both lazy (built on tee). */
export function partition<T>(predicate: Predicate<T> | null, iterable: Iterable<T>): [IterableIterator<T>, IterableIterator<T>] {
    const [t1, t2] = tee(iterable)
    return [lazyFilter(predicate, t1, false), lazyFilter(predicate, t2, true)]
}

/**
 * How many items predicate(item) is truthy for (Python truthiness; the
 * default predicate is bool). The Python recipe sums the predicate's results
 * instead, which is the same for predicates that return booleans.
 */
export function quantify<T>(iterable: Iterable<T>, predicate: Predicate<T> = bool): number {
    let n = 0
    for (const item of wrap(getIter(iterable))) {
        if (bool(predicate(item))) {
            n++
        }
    }
    return n
}
