/** Helpers shared by the modules. Not part of the public API. */

import {ValueError} from './errors.js'
import {floatRepr} from './numbers.js'

export type Key<T> = ((item: T) => unknown) | null | undefined

export function isIterable(object: unknown): object is Iterable<unknown> {
    return object !== null && object !== undefined && typeof (object as {[Symbol.iterator]?: unknown})[Symbol.iterator] === 'function'
}

export function isPlainObject(object: unknown): object is Record<string, unknown> {
    if (object === null || typeof object !== 'object') {
        return false
    }
    const proto = Object.getPrototypeOf(object)
    return proto === Object.prototype || proto === null
}

export function toArray<T>(iterable: Iterable<T> | ArrayLike<T>): T[] {
    if (Array.isArray(iterable)) {
        return iterable
    }
    if (isIterable(iterable)) {
        return Array.from(iterable as Iterable<T>)
    }
    throw new TypeError('Input must be iterable')
}

export function isInteger(n: unknown): n is number | bigint {
    return typeof n === 'bigint' || (typeof n === 'number' && Number.isInteger(n))
}

export function checkInteger(n: unknown, name: string): asserts n is number | bigint {
    if (!isInteger(n)) {
        throw new TypeError(`${name}() argument must be an integer`)
    }
}

/** The characters Python's str.isspace() accepts. */
export const WHITESPACE = '\\t\\n\\v\\f\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'

export function isSpace(ch: string): boolean {
    return new RegExp(`^[${WHITESPACE}]$`).test(ch)
}

/** Python's type names, used in error messages. */
export function typeName(x: unknown): string {
    if (x === null || x === undefined) {
        return 'NoneType'
    }
    if (typeof x === 'number') {
        return Number.isInteger(x) ? 'int' : 'float'
    }
    if (typeof x === 'bigint') {
        return 'int'
    }
    if (typeof x === 'string') {
        return 'str'
    }
    if (typeof x === 'boolean') {
        return 'bool'
    }
    if (Array.isArray(x)) {
        return 'list'
    }
    if (typeof x === 'function') {
        return 'function'
    }
    if (isPlainObject(x)) {
        return 'dict'
    }
    return (x as object).constructor?.name ?? 'object'
}

function isNumeric(x: unknown): x is number | bigint | boolean {
    return typeof x === 'number' || typeof x === 'bigint' || typeof x === 'boolean'
}

function compareStrings(a: string, b: string): number {
    const n = Math.min(a.length, b.length)
    for (let i = 0; i < n; i++) {
        const ca = a.codePointAt(i) as number
        const cb = b.codePointAt(i) as number
        if (ca !== cb) {
            return ca - cb
        }
        if (ca > 0xffff) {
            i++
        }
    }
    return a.length - b.length
}

type LessThan = {__lt__(other: unknown): boolean}

function hasLessThan(x: unknown): x is LessThan {
    return x !== null && typeof x === 'object' && typeof (x as LessThan).__lt__ === 'function'
}

/**
 * Python's ordering: numbers numerically, strings by code point, arrays
 * (tuples) lexicographically, Dates by time, and objects with a __lt__
 * method through that method. Anything else raises a TypeError, like
 * Python does for '<' between unrelated types.
 */
export function compare(a: unknown, b: unknown): number {
    if (isNumeric(a) && isNumeric(b)) {
        if (Number.isNaN(a) || Number.isNaN(b)) {
            return 0
        }
        return a < b ? -1 : a > b ? 1 : 0
    }
    if (typeof a === 'string' && typeof b === 'string') {
        return compareStrings(a, b)
    }
    if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime()
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        const n = Math.min(a.length, b.length)
        for (let i = 0; i < n; i++) {
            if (!equals(a[i], b[i])) {
                return compare(a[i], b[i])
            }
        }
        return a.length - b.length
    }
    if (hasLessThan(a) || hasLessThan(b)) {
        if (hasLessThan(a) && a.__lt__(b)) {
            return -1
        }
        if (hasLessThan(b) && b.__lt__(a)) {
            return 1
        }
        return 0
    }
    throw new TypeError(`'<' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`)
}

/** a < b with Python semantics. */
export function lessThan(a: unknown, b: unknown): boolean {
    return compare(a, b) < 0
}

/** Deep equality that ignores key order, like == on Python lists and dicts. */
export function equals(a: unknown, b: unknown): boolean {
    if (a === b) {
        return true
    }
    if (typeof a === 'number' && typeof b === 'number') {
        return Number.isNaN(a) && Number.isNaN(b)
    }
    if ((typeof a === 'bigint' || typeof a === 'number') && (typeof b === 'bigint' || typeof b === 'number')) {
        // 1n == 1, like Python's int == float
        return Number.isInteger(Number(a)) && Number.isInteger(Number(b)) && BigInt(a) === BigInt(b)
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return false
    }
    const eq = (a as {__eq__?: (o: unknown) => boolean}).__eq__
    if (typeof eq === 'function') {
        return eq.call(a, b)
    }
    if (isRangeLike(a) && isRangeLike(b)) {
        return equals(Array.from(a as Iterable<unknown>), Array.from(b as Iterable<unknown>))
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
        return false
    }
    if (a instanceof Date || b instanceof Date) {
        return a instanceof Date && b instanceof Date && a.getTime() === b.getTime()
    }
    if (a instanceof RegExp || b instanceof RegExp) {
        return a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags
    }
    if (a instanceof Map || b instanceof Map) {
        if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) {
            return false
        }
        for (const [k, v] of a) {
            if (!b.has(k) || !equals(v, b.get(k))) {
                return false
            }
        }
        return true
    }
    if (a instanceof Set || b instanceof Set) {
        if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) {
            return false
        }
        for (const v of a) {
            if (!b.has(v)) {
                return false
            }
        }
        return true
    }
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) {
        return false
    }
    return keysA.every(
        (k) => Object.prototype.hasOwnProperty.call(b, k) && equals((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    )
}

function isRangeLike(x: object): boolean {
    return (x as {__range__?: boolean}).__range__ === true
}

/** Converts Python-style possibly-negative indices like PySlice_AdjustIndices. */
export function adjustSlice(
    length: number,
    start: number | null | undefined,
    stop: number | null | undefined,
    step: number | null | undefined,
): [number, number, number, number] {
    const st = step ?? 1
    if (st === 0) {
        throw new ValueError('slice step cannot be zero')
    }
    for (const v of [start, stop, step]) {
        if (v !== null && v !== undefined && !Number.isInteger(v)) {
            throw new TypeError('slice indices must be integers or None')
        }
    }
    let lo: number
    let hi: number
    if (st > 0) {
        lo = start === null || start === undefined ? 0 : start < 0 ? Math.max(0, start + length) : Math.min(start, length)
        hi = stop === null || stop === undefined ? length : stop < 0 ? Math.max(0, stop + length) : Math.min(stop, length)
    } else {
        lo = start === null || start === undefined ? length - 1 : start < 0 ? Math.max(-1, start + length) : Math.min(start, length - 1)
        hi = stop === null || stop === undefined ? -1 : stop < 0 ? Math.max(-1, stop + length) : Math.min(stop, length - 1)
    }
    let count = 0
    if (st > 0 && lo < hi) {
        count = Math.floor((hi - lo - 1) / st) + 1
    } else if (st < 0 && hi < lo) {
        count = Math.floor((lo - hi - 1) / -st) + 1
    }
    return [lo, hi, st, count]
}

/** Python's repr() of a string: picks quotes like CPython and escapes non-printables. */
export function stringRepr(s: string): string {
    const quote = s.includes("'") && !s.includes('"') ? '"' : "'"
    let out = quote
    for (const ch of s) {
        const cp = ch.codePointAt(0) as number
        if (ch === quote || ch === '\\') {
            out += `\\${ch}`
        } else if (ch === '\n') {
            out += '\\n'
        } else if (ch === '\r') {
            out += '\\r'
        } else if (ch === '\t') {
            out += '\\t'
        } else if (cp < 0x20 || cp === 0x7f) {
            out += `\\x${cp.toString(16).padStart(2, '0')}`
        } else if (cp >= 0x80 && !isPrintable(ch)) {
            if (cp <= 0xff) {
                out += `\\x${cp.toString(16).padStart(2, '0')}`
            } else if (cp <= 0xffff) {
                out += `\\u${cp.toString(16).padStart(4, '0')}`
            } else {
                out += `\\U${cp.toString(16).padStart(8, '0')}`
            }
        } else {
            out += ch
        }
    }
    return out + quote
}

/** Roughly Python's str.isprintable() for a single character. */
function isPrintable(ch: string): boolean {
    if (ch === ' ') {
        return true
    }
    return !/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]/u.test(ch)
}

/**
 * Python's repr() for JavaScript values: strings get quotes, numbers print
 * like Python ints and floats, true/false/null become True/False/None,
 * arrays become lists, plain objects and Maps become dicts and Sets become
 * sets. Objects can define __repr__() to customise it.
 */
export function pyRepr(x: unknown, seen: Set<unknown> = new Set()): string {
    if (x === null || x === undefined) {
        return 'None'
    }
    if (x === true) {
        return 'True'
    }
    if (x === false) {
        return 'False'
    }
    if (typeof x === 'number') {
        return Number.isInteger(x) ? BigInt(x).toString() : floatRepr(x)
    }
    if (typeof x === 'bigint') {
        return x.toString()
    }
    if (typeof x === 'string') {
        return stringRepr(x)
    }
    if (typeof x === 'function') {
        return `<function ${x.name || '<lambda>'}>`
    }
    if (typeof x === 'symbol') {
        return x.toString()
    }
    const custom = (x as {__repr__?: () => string}).__repr__
    if (typeof custom === 'function') {
        return custom.call(x)
    }
    if (seen.has(x)) {
        return Array.isArray(x) ? '[...]' : '{...}'
    }
    seen.add(x)
    try {
        if (Array.isArray(x)) {
            return `[${x.map((v) => pyRepr(v, seen)).join(', ')}]`
        }
        if (x instanceof Map) {
            return `{${Array.from(x, ([k, v]) => `${pyRepr(k, seen)}: ${pyRepr(v, seen)}`).join(', ')}}`
        }
        if (x instanceof Set) {
            return x.size === 0 ? 'set()' : `{${Array.from(x, (v) => pyRepr(v, seen)).join(', ')}}`
        }
        if (isPlainObject(x)) {
            return `{${Object.entries(x).map(([k, v]) => `${stringRepr(k)}: ${pyRepr(v, seen)}`).join(', ')}}`
        }
        return String(x)
    } finally {
        seen.delete(x)
    }
}
