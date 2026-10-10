/**
 * Python's functools module: reduce, partial, cache, lru_cache and cmp_to_key.
 */

import {isIterable, isPlainObject, typeName} from './internal.js'

const NO_INITIAL = Symbol('NO_INITIAL')

/**
 * Folds the iterable from the left: reduce((acc, x) => acc + x, [1, 2, 3]) is
 * ((1 + 2) + 3). TypeError when the iterable is empty and no initial value is given.
 */
export function reduce<T>(fn: (accumulator: T, item: T) => T, iterable: Iterable<T>): T
export function reduce<T, A>(fn: (accumulator: A, item: T) => A, iterable: Iterable<T>, initial: A): A
export function reduce(
    fn: (accumulator: unknown, item: unknown) => unknown,
    iterable: Iterable<unknown>,
    ...rest: unknown[]
): unknown {
    if (!isIterable(iterable)) {
        throw new TypeError(`reduce() arg 2 must support iteration`)
    }
    let accumulator: unknown = rest.length > 0 ? rest[0] : NO_INITIAL
    for (const item of iterable) {
        accumulator = accumulator === NO_INITIAL ? item : fn(accumulator, item)
    }
    if (accumulator === NO_INITIAL) {
        throw new TypeError('reduce() of empty iterable with no initial value')
    }
    return accumulator
}

/** A function with some leading arguments filled in, returned by partial(). */
export interface PartialFunction<A extends unknown[], B extends unknown[], R> {
    (...args: B): R
    /** The wrapped function. */
    readonly func: (...args: [...A, ...B]) => R
    /** The arguments filled in. */
    readonly args: A
}

/**
 * fn with its first arguments fixed: partial(Math.pow, 2)(10) is 1024. The
 * result has .func and .args, and partials of partials are flattened like Python's.
 */
export function partial<A extends unknown[], B extends unknown[], R>(
    fn: (...args: [...A, ...B]) => R,
    ...args: A
): PartialFunction<A, B, R> {
    if (typeof fn !== 'function') {
        throw new TypeError('the first argument must be callable')
    }
    let func = fn as (...args: unknown[]) => R
    let bound: unknown[] = args
    const inner = fn as unknown as Partial<PartialFunction<unknown[], unknown[], R>>
    if (inner.func && Array.isArray(inner.args) && (fn as {__partial__?: boolean}).__partial__) {
        func = inner.func
        bound = [...inner.args, ...args]
    }
    const wrapper = function (this: unknown, ...more: unknown[]): R {
        return func.apply(this, [...bound, ...more])
    }
    Object.defineProperties(wrapper, {
        func: {value: func},
        args: {value: Object.freeze(bound.slice())},
        __partial__: {value: true},
        name: {value: `partial(${func.name || '<lambda>'})`},
    })
    return wrapper as unknown as PartialFunction<A, B, R>
}

/** Cache statistics, like Python's CacheInfo named tuple. */
export interface CacheInfo {
    hits: number
    misses: number
    maxsize: number | null
    currsize: number
}

/** A memoized function returned by cache() and lru_cache(). */
export interface CachedFunction<F extends (...args: any[]) => any> {
    (...args: Parameters<F>): ReturnType<F>
    /** Hit and miss counts, maxsize and the current number of entries. */
    cache_info(): CacheInfo
    /** Empties the cache and resets the statistics. */
    cache_clear(): void
    /** The cache settings, like Python's cache_parameters(). */
    cache_parameters(): {maxsize: number | null; typed: boolean}
    /** The original function. */
    readonly __wrapped__: F
}

const objectIds = new WeakMap<object, number>()
let nextObjectId = 0

function objectId(x: object): number {
    let id = objectIds.get(x)
    if (id === undefined) {
        id = nextObjectId++
        objectIds.set(x, id)
    }
    return id
}

/**
 * A cache key for one argument. Equal numbers, booleans and bigints share a
 * key (Python's 1 == 1.0 == True), arrays are tuples, and class instances
 * and functions are keyed by identity. Plain objects, Maps and Sets are
 * unhashable, like Python's dict and set.
 */
function makeKey(x: unknown): string {
    if (x === null || x === undefined) {
        return 'N'
    }
    if (typeof x === 'boolean') {
        return x ? 'n1' : 'n0'
    }
    if (typeof x === 'number') {
        return `n${x === 0 ? 0 : x}`
    }
    if (typeof x === 'bigint') {
        const n = Number(x)
        return BigInt(n) === x ? `n${n}` : `n${x}`
    }
    if (typeof x === 'string') {
        return `s${JSON.stringify(x)}`
    }
    if (Array.isArray(x)) {
        return `[${x.map(makeKey).join(',')}]`
    }
    if (typeof x === 'symbol') {
        return `y${x.toString()}#${objectId(Object(x))}`
    }
    if (isPlainObject(x) || x instanceof Map || x instanceof Set) {
        throw new TypeError(`unhashable type: '${x instanceof Map ? 'dict' : x instanceof Set ? 'set' : typeName(x)}'`)
    }
    return `o${objectId(x as object)}`
}

function callKey(self: unknown, args: unknown[]): string {
    const keys = args.map(makeKey).join(',')
    // methods are cached per instance, like Python where self is an argument
    return self !== undefined && self !== null && self !== globalThis && (typeof self === 'object' || typeof self === 'function')
        ? `${makeKey(self)}|${keys}`
        : keys
}

function memoize<F extends (...args: any[]) => any>(fn: F, maxsize: number | null): CachedFunction<F> {
    const store = new Map<string, ReturnType<F>>()
    let hits = 0
    let misses = 0
    const wrapper = function (this: unknown, ...args: Parameters<F>): ReturnType<F> {
        if (maxsize === 0) {
            misses++
            return fn.apply(this, args)
        }
        const key = callKey(this, args)
        if (store.has(key)) {
            hits++
            const value = store.get(key) as ReturnType<F>
            if (maxsize !== null) {
                // move to the most recently used end
                store.delete(key)
                store.set(key, value)
            }
            return value
        }
        misses++
        const result = fn.apply(this, args)
        if (store.has(key)) {
            // a recursive call already cached this key
            return result
        }
        if (maxsize !== null && store.size >= maxsize) {
            store.delete(store.keys().next().value as string)
        }
        store.set(key, result)
        return result
    }
    Object.defineProperties(wrapper, {
        cache_info: {value: (): CacheInfo => ({hits, misses, maxsize, currsize: store.size})},
        cache_clear: {
            value: (): void => {
                store.clear()
                hits = 0
                misses = 0
            },
        },
        cache_parameters: {value: () => ({maxsize, typed: false})},
        __wrapped__: {value: fn},
        name: {value: fn.name},
    })
    return wrapper as unknown as CachedFunction<F>
}

/**
 * Memoizes fn without a size limit. Arguments must be primitives, arrays of
 * them (tuples) or objects (keyed by identity); 1, 1n and true share an entry
 * like in Python. Keyword arguments and typed=True are not supported.
 */
export function cache<F extends (...args: any[]) => any>(fn: F): CachedFunction<F> {
    return memoize(fn, null)
}

/**
 * Memoizes fn, keeping the `maxsize` most recently used results (null for no
 * limit): lru_cache(128)(fn). lru_cache(fn) uses maxsize 128.
 */
export function lru_cache<F extends (...args: any[]) => any>(fn: F): CachedFunction<F>
export function lru_cache(maxsize?: number | null): <F extends (...args: any[]) => any>(fn: F) => CachedFunction<F>
export function lru_cache(maxsize: unknown = 128): unknown {
    if (typeof maxsize === 'function') {
        return memoize(maxsize as (...args: unknown[]) => unknown, 128)
    }
    if (maxsize !== null && typeof maxsize !== 'number') {
        throw new TypeError('Expected first argument to be an integer, a callable, or None')
    }
    const size = maxsize === null ? null : Math.max(0, maxsize)
    return <F extends (...args: any[]) => any>(fn: F) => memoize(fn, size)
}

/** A sort key wrapping a value, made by cmp_to_key(); ordered through the comparison function. */
export interface CmpKey<T> {
    readonly obj: T
    __lt__(other: CmpKey<T>): boolean
    __gt__(other: CmpKey<T>): boolean
    __le__(other: CmpKey<T>): boolean
    __ge__(other: CmpKey<T>): boolean
    __eq__(other: unknown): boolean
}

/**
 * Converts an old-style comparison function (negative, zero or positive) into
 * a key function for sorted(), min(), max(), heapq and bisect.
 */
export function cmp_to_key<T>(cmp: (a: T, b: T) => number): (obj: T) => CmpKey<T> {
    class K implements CmpKey<T> {
        readonly obj: T
        constructor(obj: T) {
            this.obj = obj
        }
        __lt__(other: CmpKey<T>): boolean {
            return cmp(this.obj, other.obj) < 0
        }
        __gt__(other: CmpKey<T>): boolean {
            return cmp(this.obj, other.obj) > 0
        }
        __le__(other: CmpKey<T>): boolean {
            return cmp(this.obj, other.obj) <= 0
        }
        __ge__(other: CmpKey<T>): boolean {
            return cmp(this.obj, other.obj) >= 0
        }
        __eq__(other: unknown): boolean {
            return other instanceof K && cmp(this.obj, other.obj) === 0
        }
    }
    return (obj: T) => new K(obj)
}
