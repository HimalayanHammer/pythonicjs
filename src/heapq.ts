/**
 * Python's heapq module: a binary min-heap kept in a plain array, ported from
 * CPython's Lib/heapq.py so heap layouts and results are identical. Items are
 * ordered like Python (numbers, strings by code point, arrays as tuples,
 * objects with __lt__).
 */

import {IndexError} from './errors.js'
import {compare, isIterable, isPlainObject, type Key, toArray, typeName} from './internal.js'

type LessThan<T> = (a: T, b: T) => boolean

const lt = (a: unknown, b: unknown): boolean => compare(a, b) < 0
const gt = (a: unknown, b: unknown): boolean => compare(b, a) < 0

function emptyError(): IndexError {
    return new IndexError('index out of range')
}

// _siftdown(heap, startpos, pos): follow the path to the root, moving parents
// down until finding a place newitem fits.
function siftdown<T>(heap: T[], startpos: number, pos: number, less: LessThan<T>): void {
    const newitem = heap[pos]
    while (pos > startpos) {
        const parentpos = (pos - 1) >> 1
        const parent = heap[parentpos]
        if (less(newitem, parent)) {
            heap[pos] = parent
            pos = parentpos
            continue
        }
        break
    }
    heap[pos] = newitem
}

// _siftup(heap, pos): bubble the smaller child up until hitting a leaf, then
// sift newitem into place.
function siftup<T>(heap: T[], pos: number, less: LessThan<T>): void {
    const endpos = heap.length
    const startpos = pos
    const newitem = heap[pos]
    let childpos = 2 * pos + 1
    while (childpos < endpos) {
        const rightpos = childpos + 1
        if (rightpos < endpos && !less(heap[childpos], heap[rightpos])) {
            childpos = rightpos
        }
        heap[pos] = heap[childpos]
        pos = childpos
        childpos = 2 * pos + 1
    }
    heap[pos] = newitem
    siftdown(heap, startpos, pos, less)
}

function push<T>(heap: T[], item: T, less: LessThan<T>): void {
    heap.push(item)
    siftdown(heap, 0, heap.length - 1, less)
}

function pop<T>(heap: T[], less: LessThan<T>): T {
    if (heap.length === 0) {
        throw emptyError()
    }
    const lastelt = heap.pop() as T
    if (heap.length > 0) {
        const returnitem = heap[0]
        heap[0] = lastelt
        siftup(heap, 0, less)
        return returnitem
    }
    return lastelt
}

function replace<T>(heap: T[], item: T, less: LessThan<T>): T {
    if (heap.length === 0) {
        throw emptyError()
    }
    const returnitem = heap[0]
    heap[0] = item
    siftup(heap, 0, less)
    return returnitem
}

function pushpop<T>(heap: T[], item: T, less: LessThan<T>): T {
    if (heap.length > 0 && less(heap[0], item)) {
        const top = heap[0]
        heap[0] = item
        siftup(heap, 0, less)
        return top
    }
    return item
}

function heapifyWith<T>(x: T[], less: LessThan<T>): void {
    for (let i = (x.length >> 1) - 1; i >= 0; i--) {
        siftup(x, i, less)
    }
}

/** Pushes item onto the heap, keeping the heap invariant. */
export function heappush<T>(heap: T[], item: T): void {
    push(heap, item, lt)
}

/** Pops and returns the smallest item. IndexError when the heap is empty. */
export function heappop<T>(heap: T[]): T {
    return pop(heap, lt)
}

/** Turns an array into a heap, in place, in linear time. */
export function heapify<T>(x: T[]): void {
    heapifyWith(x, lt)
}

/** Pops the smallest item and pushes `item`, in that order (faster than heappop then heappush). */
export function heapreplace<T>(heap: T[], item: T): T {
    return replace(heap, item, lt)
}

/** Pushes `item` then pops and returns the smallest item (faster than heappush then heappop). */
export function heappushpop<T>(heap: T[], item: T): T {
    return pushpop(heap, item, lt)
}

/** Pushes item onto a max-heap (Python 3.14's heapq.heappush_max). */
export function heappush_max<T>(heap: T[], item: T): void {
    push(heap, item, gt)
}

/** Pops and returns the largest item of a max-heap (Python 3.14). */
export function heappop_max<T>(heap: T[]): T {
    return pop(heap, gt)
}

/** Turns an array into a max-heap, in place (Python 3.14). */
export function heapify_max<T>(x: T[]): void {
    heapifyWith(x, gt)
}

/** Pops the largest item of a max-heap and pushes `item` (Python 3.14). */
export function heapreplace_max<T>(heap: T[], item: T): T {
    return replace(heap, item, gt)
}

/** Pushes `item` onto a max-heap then pops and returns the largest item (Python 3.14). */
export function heappushpop_max<T>(heap: T[], item: T): T {
    return pushpop(heap, item, gt)
}

/** The length when it is known without consuming the iterable, like len() in nlargest. */
function knownSize(iterable: Iterable<unknown>): number | null {
    if (typeof iterable === 'string' || Array.isArray(iterable)) {
        return iterable.length
    }
    if (iterable instanceof Map || iterable instanceof Set) {
        return iterable.size
    }
    const custom = (iterable as {__len__?: () => number}).__len__
    return typeof custom === 'function' ? custom.call(iterable) : null
}

function stableSort<T>(values: T[], key: Key<T>, reverse: boolean): T[] {
    const keys = key ? values.map((v) => key(v)) : values
    const order = values.map((_, i) => i)
    order.sort((i, j) => (reverse ? compare(keys[j], keys[i]) : compare(keys[i], keys[j])))
    return order.map((i) => values[i])
}

/** The first extreme item, like Python's max()/min(): replaced only by a strictly better one. */
function extreme<T>(iterable: Iterable<T>, key: Key<T>, better: LessThan<unknown>): T[] {
    let found = false
    let best: T | undefined
    let bestKey: unknown
    for (const item of iterable) {
        const k = key ? key(item) : item
        if (!found) {
            found = true
            best = item
            bestKey = k
        } else if (better(k, bestKey)) {
            best = item
            bestKey = k
        }
    }
    return found ? [best as T] : []
}

function checkIterable(iterable: unknown): asserts iterable is Iterable<unknown> {
    if (!isIterable(iterable)) {
        throw new TypeError(`'${typeName(iterable)}' object is not iterable`)
    }
}

type Decorated<T> = [unknown, number, T]

/** Compares decorated [key, order, item] entries on (key, order) only, like the tuples in heapq.py. */
function decoratedLess<T>(base: LessThan<unknown>): LessThan<Decorated<T>> {
    return (a, b) => base([a[0], a[1]], [b[0], b[1]])
}

/**
 * The n largest items, largest first, like sorted(iterable, {key, reverse: true}).slice(0, n)
 * (stable: equal items keep their original order).
 */
export function nlargest<T>(n: number, iterable: Iterable<T>, key?: Key<T>): T[] {
    checkIterable(iterable)
    if (n === 1) {
        return extreme(iterable, key, gt)
    }
    const size = knownSize(iterable)
    if (size !== null && n >= size) {
        return stableSort(toArray(iterable), key, true).slice(0, n)
    }
    const it = iterable[Symbol.iterator]()
    const result: Decorated<T>[] = []
    for (let i = 0; i > -n; i--) {
        const step = it.next()
        if (step.done) {
            break
        }
        result.push([key ? key(step.value) : step.value, i, step.value])
    }
    if (result.length === 0) {
        return []
    }
    const less = decoratedLess<T>(lt)
    heapifyWith(result, less)
    let top = result[0][0]
    let order = -n
    for (let step = it.next(); !step.done; step = it.next()) {
        const k = key ? key(step.value) : step.value
        if (lt(top, k)) {
            replace(result, [k, order, step.value], less)
            top = result[0][0]
            order -= 1
        }
    }
    result.sort((a, b) => compare([b[0], b[1]], [a[0], a[1]]))
    return result.map((r) => r[2])
}

/**
 * The n smallest items, smallest first, like sorted(iterable, {key}).slice(0, n)
 * (stable: equal items keep their original order).
 */
export function nsmallest<T>(n: number, iterable: Iterable<T>, key?: Key<T>): T[] {
    checkIterable(iterable)
    if (n === 1) {
        return extreme(iterable, key, lt)
    }
    const size = knownSize(iterable)
    if (size !== null && n >= size) {
        return stableSort(toArray(iterable), key, false).slice(0, n)
    }
    const it = iterable[Symbol.iterator]()
    const result: Decorated<T>[] = []
    for (let i = 0; i < n; i++) {
        const step = it.next()
        if (step.done) {
            break
        }
        result.push([key ? key(step.value) : step.value, i, step.value])
    }
    if (result.length === 0) {
        return []
    }
    const greater = decoratedLess<T>(gt)
    heapifyWith(result, greater)
    let top = result[0][0]
    let order = n
    for (let step = it.next(); !step.done; step = it.next()) {
        const k = key ? key(step.value) : step.value
        if (lt(k, top)) {
            replace(result, [k, order, step.value], greater)
            top = result[0][0]
            order += 1
        }
    }
    result.sort((a, b) => compare([a[0], a[1]], [b[0], b[1]]))
    return result.map((r) => r[2])
}

/** Options for merge(). */
export interface MergeOptions<T> {
    key?: Key<T>
    reverse?: boolean
}

interface MergeEntry<T> {
    key: unknown
    order: number
    value: T
    it: Iterator<T>
}

/**
 * Lazily merges already-sorted iterables into one sorted stream. Pass
 * {key, reverse} as the last argument. Stable: ties come from the earlier iterable.
 */
export function merge<T>(...iterables: Iterable<T>[]): Generator<T, void, undefined>
export function merge<T>(...args: [...Iterable<T>[], MergeOptions<T>]): Generator<T, void, undefined>
export function* merge<T>(...args: unknown[]): Generator<T, void, undefined> {
    let options: MergeOptions<T> = {}
    if (args.length > 0 && isPlainObject(args[args.length - 1])) {
        options = args.pop() as MergeOptions<T>
    }
    const key = options.key ?? null
    const direction = options.reverse ? -1 : 1
    const base = options.reverse ? gt : lt
    const less: LessThan<MergeEntry<T>> = (a, b) => base([a.key, a.order], [b.key, b.order])
    const h: MergeEntry<T>[] = []
    for (const [order, iterable] of args.entries()) {
        checkIterable(iterable)
        const it = (iterable as Iterable<T>)[Symbol.iterator]()
        const step = it.next()
        if (!step.done) {
            h.push({key: key ? key(step.value) : step.value, order: order * direction, value: step.value, it})
        }
    }
    heapifyWith(h, less)
    while (h.length > 1) {
        const s = h[0]
        yield s.value
        const step = s.it.next()
        if (step.done) {
            pop(h, less)
        } else {
            s.value = step.value
            s.key = key ? key(step.value) : step.value
            replace(h, s, less)
        }
    }
    if (h.length > 0) {
        const last = h[0]
        yield last.value
        for (let step = last.it.next(); !step.done; step = last.it.next()) {
            yield step.value
        }
    }
}
