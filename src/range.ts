import {ValueError} from './errors.js'
import {adjustSlice, checkInteger} from './internal.js'

/**
 * A lazy sequence of integers, like Python's range. It is iterable, has a
 * length, supports negative indexes through at(), and has the common array
 * methods (map, filter, forEach, reduce, ...) so it can be used like an array
 * without allocating one. Use list(range(n)) or [...range(n)] for an array.
 */
export class Range implements Iterable<number> {
    readonly start: number
    readonly stop: number
    readonly step: number
    readonly length: number
    /** @internal marker used by equals() */
    readonly __range__ = true

    constructor(start: number, stop: number, step = 1) {
        checkInteger(start, 'range')
        checkInteger(stop, 'range')
        checkInteger(step, 'range')
        if (step === 0) {
            throw new ValueError('range() arg 3 must not be zero')
        }
        this.start = Number(start)
        this.stop = Number(stop)
        this.step = Number(step)
        this.length = Math.max(0, Math.ceil((this.stop - this.start) / this.step))
        Object.defineProperty(this, '__range__', {enumerable: false})
    }

    *[Symbol.iterator](): IterableIterator<number> {
        for (let i = 0; i < this.length; i++) {
            yield this.start + i * this.step
        }
    }

    /** The item at `index`; negative indexes count from the end. */
    at(index: number): number | undefined {
        const i = index < 0 ? this.length + index : index
        if (!Number.isInteger(i) || i < 0 || i >= this.length) {
            return undefined
        }
        return this.start + i * this.step
    }

    includes(value: unknown): boolean {
        return this.indexOf(value) !== -1
    }

    indexOf(value: unknown): number {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            return -1
        }
        const offset = value - this.start
        if (offset % this.step !== 0) {
            return -1
        }
        const i = offset / this.step
        return i >= 0 && i < this.length ? i : -1
    }

    /** Python's range.index(): like indexOf but raises ValueError when missing. */
    index(value: unknown): number {
        const i = this.indexOf(value)
        if (i === -1) {
            throw new ValueError(`${String(value)} is not in range`)
        }
        return i
    }

    count(value: unknown): number {
        return this.includes(value) ? 1 : 0
    }

    /** Python's range[start:stop:step], returning another Range. */
    slice(start?: number | null, stop?: number | null, step?: number | null): Range {
        // CPython's compute_slice: map the adjusted slice indices onto this range
        const [lo, hi, st] = adjustSlice(this.length, start, stop, step)
        return new Range(this.start + lo * this.step, this.start + hi * this.step, this.step * st)
    }

    toArray(): number[] {
        return Array.from(this)
    }

    toJSON(): number[] {
        return this.toArray()
    }

    toString(): string {
        return this.step === 1 ? `range(${this.start}, ${this.stop})` : `range(${this.start}, ${this.stop}, ${this.step})`
    }

    [Symbol.for('nodejs.util.inspect.custom')](): string {
        return this.toString()
    }

    map<U>(fn: (value: number, index: number) => U): U[] {
        const result: U[] = []
        let i = 0
        for (const value of this) {
            result.push(fn(value, i++))
        }
        return result
    }

    filter(fn: (value: number, index: number) => unknown): number[] {
        const result: number[] = []
        let i = 0
        for (const value of this) {
            if (fn(value, i++)) {
                result.push(value)
            }
        }
        return result
    }

    forEach(fn: (value: number, index: number) => void): void {
        let i = 0
        for (const value of this) {
            fn(value, i++)
        }
    }

    reduce<U>(fn: (acc: U, value: number, index: number) => U, initial: U): U {
        let acc = initial
        let i = 0
        for (const value of this) {
            acc = fn(acc, value, i++)
        }
        return acc
    }

    some(fn: (value: number, index: number) => unknown): boolean {
        let i = 0
        for (const value of this) {
            if (fn(value, i++)) {
                return true
            }
        }
        return false
    }

    every(fn: (value: number, index: number) => unknown): boolean {
        let i = 0
        for (const value of this) {
            if (!fn(value, i++)) {
                return false
            }
        }
        return true
    }

    find(fn: (value: number, index: number) => unknown): number | undefined {
        let i = 0
        for (const value of this) {
            if (fn(value, i++)) {
                return value
            }
        }
        return undefined
    }

    join(separator = ','): string {
        return this.toArray().join(separator)
    }

    reverse(): Range {
        return this.slice(null, null, -1)
    }
}

/**
 * range(stop) or range(start, stop, step = 1). Returns a lazy Range, so
 * `for (const i of range(1e9))` does not allocate a billion-item array.
 */
export function range(stop: number): Range
export function range(start: number, stop: number, step?: number): Range
export function range(start: number, stop?: number, step = 1): Range {
    if (stop === undefined) {
        return new Range(0, start, 1)
    }
    return new Range(start, stop, step)
}
