/**
 * Python's bisect module: binary search and insertion into sorted arrays,
 * with Python's ordering (see compare()). Every function takes
 * (a, x, lo = 0, hi = a.length, key) like Python, or a trailing options
 * object: bisect_left(a, x, {lo, hi, key}).
 */

import {IndexError, ValueError} from './errors.js'
import {checkInteger, compare, isPlainObject} from './internal.js'

/** Options for the bisect functions: the slice a[lo:hi] to search and a key function. */
export interface BisectOptions<T, K = T> {
    lo?: number
    hi?: number | null
    key?: ((item: T) => K) | null
}

type Args<T, K> = [lo?: number | BisectOptions<T, K>, hi?: number | null | BisectOptions<T, K>, key?: ((item: T) => K) | null | BisectOptions<T, K>]

interface Parsed<T, K> {
    lo: number
    hi: number
    key: ((item: T) => K) | null
}

function parse<T, K>(a: ArrayLike<T>, args: unknown[]): Parsed<T, K> {
    let options: BisectOptions<T, K> = {}
    const positional = args.slice()
    if (positional.length > 0 && isPlainObject(positional[positional.length - 1])) {
        options = positional.pop() as BisectOptions<T, K>
    }
    const lo = (positional[0] ?? options.lo ?? 0) as number
    // CPython's C implementation treats hi=-1 like hi=None
    let hi = (positional[1] ?? options.hi ?? -1) as number
    const key = (positional[2] ?? options.key ?? null) as ((item: T) => K) | null
    checkInteger(lo, 'bisect')
    checkInteger(hi, 'bisect')
    if (lo < 0) {
        throw new ValueError('lo must be non-negative')
    }
    if (hi === -1) {
        hi = a.length
    }
    return {lo: Number(lo), hi: Number(hi), key}
}

function item<T>(a: ArrayLike<T>, i: number): T {
    if (i >= a.length) {
        throw new IndexError('list index out of range')
    }
    return a[i]
}

function right<T, K>(a: ArrayLike<T>, x: unknown, {lo, hi, key}: Parsed<T, K>): number {
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        const value = key ? key(item(a, mid)) : item(a, mid)
        if (compare(x, value) < 0) {
            hi = mid
        } else {
            lo = mid + 1
        }
    }
    return lo
}

function left<T, K>(a: ArrayLike<T>, x: unknown, {lo, hi, key}: Parsed<T, K>): number {
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2)
        const value = key ? key(item(a, mid)) : item(a, mid)
        if (compare(value, x) < 0) {
            lo = mid + 1
        } else {
            hi = mid
        }
    }
    return lo
}

/**
 * The index where x would be inserted to keep `a` sorted, after any entries
 * equal to x. With a key, x is compared to key(item), so pass the key of x.
 */
export function bisect_right<T>(a: ArrayLike<T>, x: T, lo?: number | BisectOptions<T>, hi?: number | null | BisectOptions<T>): number
export function bisect_right<T, K>(a: ArrayLike<T>, x: K, lo: number, hi: number | null | undefined, key: ((item: T) => K) | null): number
export function bisect_right<T, K>(a: ArrayLike<T>, x: K, options: BisectOptions<T, K>): number
export function bisect_right<T, K>(a: ArrayLike<T>, x: unknown, ...args: Args<T, K>): number {
    return right(a, x, parse<T, K>(a, args))
}

/**
 * The index where x would be inserted to keep `a` sorted, before any entries
 * equal to x. With a key, x is compared to key(item), so pass the key of x.
 */
export function bisect_left<T>(a: ArrayLike<T>, x: T, lo?: number | BisectOptions<T>, hi?: number | null | BisectOptions<T>): number
export function bisect_left<T, K>(a: ArrayLike<T>, x: K, lo: number, hi: number | null | undefined, key: ((item: T) => K) | null): number
export function bisect_left<T, K>(a: ArrayLike<T>, x: K, options: BisectOptions<T, K>): number
export function bisect_left<T, K>(a: ArrayLike<T>, x: unknown, ...args: Args<T, K>): number {
    return left(a, x, parse<T, K>(a, args))
}

/** Same as bisect_right. */
export const bisect = bisect_right

/** Inserts x into the sorted array `a`, after any entries equal to x. With a key, key(x) is used. */
export function insort_right<T>(a: T[], x: T, lo?: number | BisectOptions<T, unknown>, hi?: number | null | BisectOptions<T, unknown>, key?: ((item: T) => unknown) | null): void
export function insort_right<T>(a: T[], x: T, ...args: Args<T, unknown>): void {
    const parsed = parse<T, unknown>(a, args)
    a.splice(right(a, parsed.key ? parsed.key(x) : x, parsed), 0, x)
}

/** Inserts x into the sorted array `a`, before any entries equal to x. With a key, key(x) is used. */
export function insort_left<T>(a: T[], x: T, lo?: number | BisectOptions<T, unknown>, hi?: number | null | BisectOptions<T, unknown>, key?: ((item: T) => unknown) | null): void
export function insort_left<T>(a: T[], x: T, ...args: Args<T, unknown>): void {
    const parsed = parse<T, unknown>(a, args)
    a.splice(left(a, parsed.key ? parsed.key(x) : x, parsed), 0, x)
}

/** Same as insort_right. */
export const insort = insort_right
