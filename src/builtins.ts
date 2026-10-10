/**
 * Python's built-in functions, plus a few list and dict methods written as
 * functions (append(xs, x) instead of xs.append(x)).
 */

import {IndexError, KeyError, OverflowError, StopIteration, ValueError, ZeroDivisionError} from './errors.js'
import {
    adjustSlice,
    checkInteger,
    compare,
    equals as deepEquals,
    isInteger,
    isIterable,
    isPlainObject,
    type Key,
    toArray,
    typeName,
} from './internal.js'
import {exactDecimal, roundDecimal} from './numbers.js'
import {Range} from './range.js'

type Mapping<V = unknown> = Record<string, V> | Map<unknown, V>

function notIterable(x: unknown): TypeError {
    return new TypeError(`'${typeName(x)}' object is not iterable`)
}

function iterableArray<T>(x: Iterable<T>): T[] {
    if (!isIterable(x)) {
        throw notIterable(x)
    }
    return toArray(x)
}

function hasSurrogates(s: string): boolean {
    return /[\uD800-\uDFFF]/.test(s)
}

// ---------------------------------------------------------------------------
// printing and logging
// ---------------------------------------------------------------------------

/** Prints values to the console, like Python's print(). */
export function print(...values: unknown[]): void {
    console.log(...values)
}

/** Returns an object as pretty-printed (indented) JSON. */
export function pprintr(object: unknown): string {
    return JSON.stringify(object, null, 2)
}

/** Prints an object as pretty-printed (indented) JSON. */
export function pprint(object: unknown): void {
    print(pprintr(object))
}

/** The current time as an ISO 8601 string. */
export function timestamp(): string {
    return new Date().toISOString()
}

/** Prints values prefixed with a timestamp. */
export function log(...values: unknown[]): void {
    print(timestamp(), '::==>', ...values)
}

// ---------------------------------------------------------------------------
// types and conversions
// ---------------------------------------------------------------------------

/** typeof, except that arrays give 'array' and null gives 'null'. */
export function type(object: unknown): string {
    if (object === null) {
        return 'null'
    }
    if (Array.isArray(object)) {
        return 'array'
    }
    return typeof object
}

export function is_array(object: unknown): object is unknown[] {
    return Array.isArray(object)
}

export function is_null(object: unknown): object is null {
    return object === null
}

export function is_undefined(object: unknown): object is undefined {
    return typeof object === 'undefined'
}

/** Whether the value can be called. */
export function callable(object: unknown): boolean {
    return typeof object === 'function'
}

/** Converts anything to a string (JavaScript's String()). Use repr() for Python's repr. */
export function str(...object: unknown[]): string {
    return object.length === 0 ? '' : String(object[0])
}

function toSafeInteger(value: bigint): number {
    const n = Number(value)
    return Number.isSafeInteger(n) ? n + 0 : (value as unknown as number)
}

/** Maps Unicode decimal digits (Arabic-Indic, Devanagari, fullwidth, ...) to ASCII, like Python. */
function asciiDigits(text: string): string {
    return text.replace(/\p{Nd}/gu, (ch) => {
        let cp = ch.codePointAt(0) as number
        if (cp <= 0x39) {
            return ch
        }
        let start = cp
        while (/\p{Nd}/u.test(String.fromCodePoint(start - 1))) {
            start--
        }
        cp = (cp - start) % 10
        return String(cp)
    })
}

function parseIntegerDigits(text: string, base: number): bigint {
    let result = BigInt(0)
    const big = BigInt(base)
    for (const ch of text) {
        result = result * big + BigInt(Number.parseInt(ch, 36))
    }
    return result
}

/**
 * Python's int(). Truncates numbers toward zero and parses strings strictly
 * (int('12px') raises ValueError). Understands 0x/0o/0b prefixes, base 0
 * and underscores between digits. Results beyond Number.MAX_SAFE_INTEGER
 * are returned as exact BigInts.
 */
export function int(value: unknown = 0, base = 10): number {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw Number.isNaN(value)
                ? new ValueError('cannot convert float NaN to integer')
                : new OverflowError('cannot convert float infinity to integer')
        }
        const truncated = Math.trunc(value) + 0
        return Number.isSafeInteger(truncated) ? truncated : toSafeInteger(BigInt(truncated))
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0
    }
    if (typeof value === 'bigint') {
        return toSafeInteger(value)
    }
    if (typeof value !== 'string') {
        throw new TypeError(`int() argument must be a string, a bytes-like object or a real number, not '${typeName(value)}'`)
    }
    if (!Number.isInteger(base) || (base !== 0 && (base < 2 || base > 36))) {
        throw new ValueError('int() base must be >= 2 and <= 36, or 0')
    }
    const invalid = new ValueError(`invalid literal for int() with base ${base}: '${value}'`)
    let text = asciiDigits(value.trim()).toLowerCase()
    let negative = false
    if (text[0] === '+' || text[0] === '-') {
        negative = text[0] === '-'
        text = text.slice(1)
    }
    const prefixes: Record<string, number> = {'0x': 16, '0o': 8, '0b': 2}
    const prefix = text.slice(0, 2)
    let radix = base
    if (prefixes[prefix] && (base === 0 || base === prefixes[prefix])) {
        radix = prefixes[prefix]
        text = text.slice(2).replace(/^_/, '')
    } else if (base === 0) {
        if (/^0+(_?0)*$/.test(text)) {
            return 0
        }
        if (text[0] === '0') {
            throw invalid
        }
        radix = 10
    }
    const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, radix)
    if (!new RegExp(`^[${digits}]+(_[${digits}]+)*$`).test(text)) {
        throw invalid
    }
    const parsed = parseIntegerDigits(text.replace(/_/g, ''), radix)
    return toSafeInteger(negative ? -parsed : parsed)
}

/** Python's float(). Parses strings strictly and understands 'inf' and 'nan'. */
export function float(value: unknown = 0): number {
    if (typeof value === 'number') {
        return value
    }
    if (typeof value === 'boolean') {
        return value ? 1 : 0
    }
    if (typeof value === 'bigint') {
        return Number(value)
    }
    if (typeof value !== 'string') {
        throw new TypeError(`float() argument must be a string or a real number, not '${typeName(value)}'`)
    }
    const text = asciiDigits(value.trim()).toLowerCase()
    if (/^[+-]?(inf|infinity)$/.test(text)) {
        return text[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    }
    if (/^[+-]?nan$/.test(text)) {
        return Number.NaN
    }
    const digits = '\\d+(_\\d+)*'
    const pattern = new RegExp(`^[+-]?(${digits}(\\.(${digits})?)?|\\.${digits})(e[+-]?${digits})?$`)
    if (pattern.test(text)) {
        return Number.parseFloat(text.replace(/_/g, ''))
    }
    throw new ValueError(`could not convert string to float: '${value}'`)
}

/** Python truthiness: empty strings, arrays, objects, Maps and Sets are false. */
export function bool(object?: unknown): boolean {
    if (object === null || object === undefined) {
        return false
    }
    if (typeof object === 'object') {
        if (object instanceof Map || object instanceof Set) {
            return object.size > 0
        }
        if (Array.isArray(object)) {
            return object.length > 0
        }
        if (object instanceof Range) {
            return object.length > 0
        }
        const custom = object as {__bool__?: () => boolean; __len__?: () => number}
        if (typeof custom.__bool__ === 'function') {
            return custom.__bool__()
        }
        if (typeof custom.__len__ === 'function') {
            return custom.__len__() > 0
        }
        if (isPlainObject(object)) {
            return Object.keys(object).length > 0
        }
        return true
    }
    return Boolean(object)
}

/** Python's `not x`: the opposite of bool(x). */
export function not(object: unknown): boolean {
    return !bool(object)
}

/** An array from any iterable. A plain object gives its keys, like list(dict). */
export function list<T>(iterable?: Iterable<T> | Record<string, unknown>): T[] {
    if (iterable === undefined) {
        return []
    }
    if (isPlainObject(iterable)) {
        return Object.keys(iterable) as T[]
    }
    return Array.from(iterableArray(iterable as Iterable<T>))
}

/** The character for a Unicode code point. */
export function chr(code: number): string {
    checkInteger(code, 'chr')
    if (code < 0 || code > 0x10ffff) {
        throw new ValueError('chr() arg not in range(0x110000)')
    }
    return String.fromCodePoint(code)
}

/** The Unicode code point of a single character. */
export function ord(character: string): number {
    if (typeof character !== 'string') {
        throw new TypeError(`ord() expected string of length 1, but ${typeName(character)} found`)
    }
    const chars = Array.from(character)
    if (chars.length !== 1) {
        throw new TypeError(`ord() expected a character, but string of length ${chars.length} found`)
    }
    return character.codePointAt(0) as number
}

function formatInteger(n: number | bigint, radix: number, prefix: string): string {
    if (n < 0) {
        return `-${prefix}${(-n as number).toString(radix)}`
    }
    return prefix + n.toString(radix)
}

/** '0xff'. Negative numbers give '-0x1'; BigInts work too. */
export function hex(n: number | bigint): string {
    checkInteger(n, 'hex')
    return formatInteger(n, 16, '0x')
}

/** '0o10'. */
export function oct(n: number | bigint): string {
    checkInteger(n, 'oct')
    return formatInteger(n, 8, '0o')
}

/** '0b101'. */
export function bin(n: number | bigint): string {
    checkInteger(n, 'bin')
    return formatInteger(n, 2, '0b')
}

/** n.toString(radix). */
export function base(number: number | bigint, radix: number): string {
    return number.toString(radix)
}

// ---------------------------------------------------------------------------
// math
// ---------------------------------------------------------------------------

export function abs(x: number): number
export function abs(x: bigint): bigint
export function abs(x: number | bigint): number | bigint {
    if (typeof x === 'bigint') {
        return x < 0 ? -x : x
    }
    return Math.abs(x)
}

function modInverse(a: bigint, m: bigint): bigint {
    let [oldR, r] = [((a % m) + m) % m, m < 0 ? -m : m]
    let [oldS, s] = [BigInt(1), BigInt(0)]
    while (r !== BigInt(0)) {
        const q = oldR / r
        ;[oldR, r] = [r, oldR - q * r]
        ;[oldS, s] = [s, oldS - q * s]
    }
    if (oldR !== BigInt(1)) {
        throw new ValueError('base is not invertible for the given modulus')
    }
    return oldS
}

/**
 * x ** y, or exact modular exponentiation for integers when `mod` is given
 * (a negative exponent computes the modular inverse, like Python 3.8+).
 */
export function pow(x: number, y: number, mod?: number): number
export function pow(x: bigint, y: bigint, mod?: bigint): bigint
export function pow(x: number | bigint, y: number | bigint, mod?: number | bigint): number | bigint {
    if (mod === undefined || mod === null) {
        if (typeof x === 'bigint' || typeof y === 'bigint') {
            return BigInt(x) ** BigInt(y)
        }
        if (x === 0 && y < 0) {
            throw new ZeroDivisionError('0.0 cannot be raised to a negative power')
        }
        return x ** y
    }
    checkInteger(x, 'pow')
    checkInteger(y, 'pow')
    checkInteger(mod, 'pow')
    const m = BigInt(mod)
    if (m === BigInt(0)) {
        throw new ValueError('pow() 3rd argument cannot be 0')
    }
    let b = BigInt(x) % m
    let e = BigInt(y)
    if (e < 0) {
        b = modInverse(b, m)
        e = -e
    }
    let result = BigInt(1) % m
    while (e > 0) {
        if (e % BigInt(2) === BigInt(1)) {
            result = (result * b) % m
        }
        b = (b * b) % m
        e /= BigInt(2)
    }
    if (result !== BigInt(0) && result < 0 !== m < 0) {
        result += m
    }
    return typeof mod === 'bigint' ? result : Number(result)
}

/** [a // b, a % b] with Python's floor-division sign rules. */
export function divmod(a: number, b: number): [number, number]
export function divmod(a: bigint, b: bigint): [bigint, bigint]
export function divmod(a: number | bigint, b: number | bigint): [number | bigint, number | bigint] {
    if (typeof a === 'bigint' && typeof b === 'bigint') {
        if (b === BigInt(0)) {
            throw new ZeroDivisionError('integer division or modulo by zero')
        }
        let q = a / b
        if (a % b !== BigInt(0) && a < 0 !== b < 0) {
            q -= BigInt(1)
        }
        return [q, a - q * b]
    }
    const x = Number(a)
    const y = Number(b)
    if (y === 0) {
        throw new ZeroDivisionError(
            Number.isInteger(x) && Number.isInteger(y) ? 'integer division or modulo by zero' : 'float divmod()',
        )
    }
    // CPython's float_divmod
    let mod = x % y
    let div = (x - mod) / y
    if (mod) {
        if (y < 0 !== mod < 0) {
            mod += y
            div -= 1
        }
    } else {
        mod = y < 0 ? -0 : 0
    }
    let floordiv: number
    if (div) {
        floordiv = Math.floor(div)
        if (div - floordiv > 0.5) {
            floordiv += 1
        }
    } else {
        floordiv = x / y < 0 ? -0 : 0
    }
    return [floordiv + 0, mod + 0]
}

/**
 * Python's round(): rounds half to even on the exact value, so round(2.5)
 * is 2 and round(2.675, 2) is 2.67 (2.675 is stored as 2.67499...).
 */
export function round(number: number, ndigits?: number | null): number {
    if (typeof number === 'bigint') {
        return number
    }
    if (typeof number !== 'number') {
        throw new TypeError(`type ${typeName(number)} doesn't define __round__ method`)
    }
    if (ndigits !== undefined && ndigits !== null) {
        checkInteger(ndigits, 'round')
    }
    if (!Number.isFinite(number)) {
        if (ndigits === undefined || ndigits === null) {
            throw Number.isNaN(number)
                ? new ValueError('cannot convert float NaN to integer')
                : new OverflowError('cannot convert float infinity to integer')
        }
        return number
    }
    const places = ndigits === undefined || ndigits === null ? 0 : Number(ndigits)
    if (places > 330) {
        return number
    }
    const decimal = exactDecimal(number)
    const rounded = roundDecimal(decimal, places)
    const text = `${decimal.neg ? '-' : ''}${rounded.int}${rounded.frac ? `.${rounded.frac}` : ''}`
    const result = Number(text)
    return ndigits === undefined || ndigits === null ? result + 0 : result
}

/**
 * Python's sum(). Uses compensated (Neumaier) summation for floats like
 * Python 3.12+, so sum of ten 0.1s is 1. A start array concatenates lists.
 */
export function sum(iterable: Iterable<number>, start?: number): number
export function sum(iterable: Iterable<bigint>, start: bigint): bigint
export function sum<T>(iterable: Iterable<T[]>, start: T[]): T[]
export function sum(iterable: Iterable<unknown>, start: unknown = 0): unknown {
    if (!isIterable(iterable) || typeof iterable === 'string') {
        throw typeof iterable === 'string'
            ? new TypeError("unsupported operand type(s) for +: 'int' and 'str'")
            : notIterable(iterable)
    }
    if (typeof start === 'string') {
        throw new TypeError("sum() can't sum strings [use ''.join(seq) instead]")
    }
    if (Array.isArray(start)) {
        let result = start.slice()
        for (const item of iterable) {
            if (!Array.isArray(item)) {
                throw new TypeError(`can only concatenate list (not "${typeName(item)}") to list`)
            }
            result = result.concat(item)
        }
        return result
    }
    let total = start as number | bigint
    let compensation = 0
    for (const item of iterable) {
        if (typeof item === 'number' && typeof total === 'number') {
            const t = total + item
            if (Math.abs(total) >= Math.abs(item)) {
                compensation += total - t + item
            } else {
                compensation += item - t + total
            }
            total = t
        } else if (typeof item === 'bigint' || typeof total === 'bigint') {
            if (typeof item !== 'bigint' && typeof item !== 'number') {
                throw new TypeError(`unsupported operand type(s) for +: 'int' and '${typeName(item)}'`)
            }
            if (typeof total === 'number') {
                total += compensation
                compensation = 0
            }
            total = isInteger(total) && isInteger(item) ? BigInt(total) + BigInt(item) : Number(total) + Number(item)
        } else if (typeof item === 'boolean') {
            total = (total as number) + Number(item)
        } else {
            throw new TypeError(`unsupported operand type(s) for +: '${typeName(total)}' and '${typeName(item)}'`)
        }
    }
    if (typeof total === 'number' && compensation !== 0 && Number.isFinite(compensation)) {
        total += compensation
    }
    return total
}

interface ExtremeOptions<T, D> {
    key?: Key<T>
    default?: D
}

function extreme(args: unknown[], sign: number, name: string): unknown {
    let options: ExtremeOptions<unknown, unknown> = {}
    const last = args[args.length - 1]
    if (args.length > 1 && isPlainObject(last) && ('key' in last || 'default' in last)) {
        options = last
        args = args.slice(0, -1)
    }
    let values: unknown[]
    if (args.length === 1) {
        values = iterableArray(args[0] as Iterable<unknown>)
    } else if (args.length === 0) {
        throw new TypeError(`${name} expected at least 1 argument, got 0`)
    } else {
        if ('default' in options) {
            throw new TypeError(`Cannot specify a default for ${name}() with multiple positional arguments`)
        }
        values = args
    }
    if (values.length === 0) {
        if ('default' in options) {
            return options.default
        }
        throw new ValueError(`${name}() iterable argument is empty`)
    }
    const key = options.key ?? ((x: unknown) => x)
    let best = values[0]
    let bestKey = key(best)
    for (let i = 1; i < values.length; i++) {
        const k = key(values[i])
        if (sign * compare(k, bestKey) > 0) {
            best = values[i]
            bestKey = k
        }
    }
    return best
}

/** max(iterable), max(a, b, ...), or max(iterable, {key, default}). */
export function max<T>(iterable: Iterable<T>, options?: ExtremeOptions<T, T>): T
export function max<T, D>(iterable: Iterable<T>, options: ExtremeOptions<T, D>): T | D
export function max<T>(...values: T[]): T
export function max(...args: unknown[]): unknown {
    return extreme(args, 1, 'max')
}

/** min(iterable), min(a, b, ...), or min(iterable, {key, default}). */
export function min<T>(iterable: Iterable<T>, options?: ExtremeOptions<T, T>): T
export function min<T, D>(iterable: Iterable<T>, options: ExtremeOptions<T, D>): T | D
export function min<T>(...values: T[]): T
export function min(...args: unknown[]): unknown {
    return extreme(args, -1, 'min')
}

/** The arithmetic mean. */
export function avg(list: Iterable<number>): number {
    const values = iterableArray(list)
    if (values.length === 0) {
        throw new ValueError('avg() requires at least one data point')
    }
    return sum(values) / values.length
}

/** Same as avg(). */
export function mean(list: Iterable<number>): number {
    return avg(list)
}

/** A random integer in [min, max], both ends included. */
export function random(min: number, max: number): number {
    if (typeof min !== 'number' || typeof max !== 'number') {
        throw new TypeError('Inputs must be numbers')
    }
    if (min > max) {
        throw new ValueError(`empty range in randint(${min}, ${max})`)
    }
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/** A random integer in [a, b], like random.randint. */
export function randint(a: number, b: number): number {
    return random(a, b)
}

/** A random item from a sequence, like random.choice. */
export function choice<T>(sequence: Iterable<T>): T {
    const values = iterableArray(sequence)
    if (values.length === 0) {
        throw new IndexError('Cannot choose from an empty sequence')
    }
    return values[Math.floor(Math.random() * values.length)]
}

/** Shuffles an array in place (Fisher-Yates) and returns it, like random.shuffle. */
export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
}

// ---------------------------------------------------------------------------
// sequences and iteration
// ---------------------------------------------------------------------------

/**
 * The length of a string (in code points, like Python), array, Map, Set,
 * Range, typed array, or the key count of a plain object.
 */
export function len(object: unknown): number {
    if (typeof object === 'string') {
        return hasSurrogates(object) ? Array.from(object).length : object.length
    }
    if (Array.isArray(object) || ArrayBuffer.isView(object) || object instanceof Range) {
        return (object as {length: number}).length
    }
    if (object instanceof Map || object instanceof Set) {
        return object.size
    }
    if (object !== null && typeof object === 'object' && typeof (object as {__len__?: unknown}).__len__ === 'function') {
        return (object as {__len__(): number}).__len__()
    }
    if (isPlainObject(object)) {
        return Object.keys(object).length
    }
    throw new TypeError(`object of type '${typeName(object)}' has no len()`)
}

interface SortOptions<T> {
    key?: Key<T>
    reverse?: boolean
}

function sortValues<T>(values: T[], key: Key<T>, reverse: boolean): T[] {
    const keys = key ? values.map((v) => key(v)) : values
    const order = values.map((_, i) => i)
    order.sort((i, j) => {
        const c = compare(keys[i], keys[j])
        return reverse ? -c : c
    })
    return order.map((i) => values[i])
}

function sortArgs<T>(key: Key<T> | SortOptions<T>, reverse: boolean): [Key<T>, boolean] {
    if (isPlainObject(key)) {
        const options = key as SortOptions<T>
        return [options.key ?? null, Boolean(options.reverse)]
    }
    return [key as Key<T>, Boolean(reverse)]
}

/**
 * A new sorted array (stable), like Python's sorted(). Accepts
 * sorted(xs, key, reverse) or sorted(xs, {key, reverse}). Strings sort by
 * code point, numbers numerically, arrays like tuples. A plain object returns
 * a new object with its keys sorted.
 */
export function sorted<T>(iterable: Iterable<T>, key?: Key<T> | SortOptions<T>, reverse?: boolean): T[]
export function sorted<V>(
    object: Record<string, V>,
    key?: Key<string> | SortOptions<string>,
    reverse?: boolean,
): Record<string, V>
export function sorted(iterable: unknown, key: unknown = null, reverse = false): unknown {
    const [keyFn, rev] = sortArgs(key as Key<unknown>, reverse)
    if (isPlainObject(iterable)) {
        const result: Record<string, unknown> = {}
        for (const k of sortValues(Object.keys(iterable), keyFn as Key<string>, rev)) {
            result[k] = iterable[k]
        }
        return result
    }
    return sortValues(iterableArray(iterable as Iterable<unknown>), keyFn, rev)
}

/** Sorts an array in place, like list.sort(), and returns it. */
export function sort<T>(array: T[], key?: Key<T> | SortOptions<T>, reverse?: boolean): T[] {
    const [keyFn, rev] = sortArgs(key ?? null, reverse ?? false)
    const result = sortValues(array, keyFn, rev)
    for (let i = 0; i < result.length; i++) {
        array[i] = result[i]
    }
    return array
}

/** A new reversed array; works on strings and any iterable. */
export function reversed<T>(sequence: Iterable<T>): T[] {
    return Array.from(iterableArray(sequence)).reverse()
}

/** [[start, a], [start + 1, b], ...]. */
export function enumerate<T>(iterable: Iterable<T>, start = 0): [number, T][] {
    return iterableArray(iterable).map((item, i) => [start + i, item] as [number, T])
}

type Unzip<T extends unknown[]> = {[K in keyof T]: T[K] extends Iterable<infer U> ? U : never}

/**
 * Groups items by position and stops at the shortest input. Pass
 * {strict: true} last to raise ValueError when the lengths differ.
 */
export function zip<T extends Iterable<unknown>[]>(...iterables: T): Unzip<T>[]
export function zip(...args: unknown[]): unknown[][] {
    let strict = false
    const last = args[args.length - 1]
    if (isPlainObject(last) && 'strict' in last) {
        strict = Boolean(last.strict)
        args = args.slice(0, -1)
    }
    if (args.length === 0) {
        return []
    }
    // pull items one at a time, so an infinite input (itertools.count()) is fine
    const iterators = args.map((a) => iter(a as Iterable<unknown>))
    const result: unknown[][] = []
    for (;;) {
        const row: unknown[] = []
        for (const [i, it] of iterators.entries()) {
            const step = it.next()
            if (step.done) {
                if (strict) {
                    checkZipStrict(iterators, i)
                }
                return result
            }
            row.push(step.value)
        }
        result.push(row)
    }
}

function plural(n: number): string {
    return n === 1 ? 'argument 1' : `arguments 1-${n}`
}

/** CPython's zip(strict=True) check once iterator `i` is exhausted. */
function checkZipStrict(iterators: Iterator<unknown>[], i: number): void {
    if (i > 0) {
        throw new ValueError(`zip() argument ${i + 1} is shorter than ${plural(i)}`)
    }
    for (let j = 1; j < iterators.length; j++) {
        if (!iterators[j].next().done) {
            throw new ValueError(`zip() argument ${j + 1} is longer than ${plural(j)}`)
        }
    }
}

/** Items where fn(item) is truthy; filter(null, xs) keeps truthy items (Python truthiness). */
export function filter<T>(fn: ((item: T) => unknown) | null, iterable: Iterable<T>): T[] {
    const predicate = fn ?? bool
    return iterableArray(iterable).filter((item) => predicate(item))
}

/** Like Python's map(), including several iterables (stops at the shortest). */
export function map<T, U>(fn: (item: T) => U, iterable: Iterable<T>): U[]
export function map<U>(fn: (...items: any[]) => U, ...iterables: Iterable<unknown>[]): U[]
export function map(fn: (...items: unknown[]) => unknown, ...iterables: Iterable<unknown>[]): unknown[] {
    if (iterables.length === 1) {
        return iterableArray(iterables[0]).map((item) => fn(item))
    }
    return zip(...iterables).map((items) => fn(...(items as unknown[])))
}

/** Whether any item is truthy (Python truthiness). Stops at the first one. */
export function any(iterable: Iterable<unknown>): boolean {
    if (!isIterable(iterable)) {
        throw notIterable(iterable)
    }
    for (const item of iterable) {
        if (bool(item)) {
            return true
        }
    }
    return false
}

/** Whether every item is truthy (Python truthiness). Stops at the first falsy one. */
export function all(iterable: Iterable<unknown>): boolean {
    if (!isIterable(iterable)) {
        throw notIterable(iterable)
    }
    for (const item of iterable) {
        if (!bool(item)) {
            return false
        }
    }
    return true
}

/** An iterator over an iterable, like Python's iter(). */
export function iter<T>(iterable: Iterable<T>): Iterator<T> {
    if (!isIterable(iterable)) {
        throw notIterable(iterable)
    }
    return iterable[Symbol.iterator]()
}

const NO_DEFAULT = Symbol('no default')

/** The next item of an iterator; raises StopIteration at the end unless a default is given. */
export function next<T, D = never>(iterator: Iterator<T>, defaultValue: D = NO_DEFAULT as D): T | D {
    const result = iterator.next()
    if (result.done) {
        if (defaultValue === (NO_DEFAULT as unknown)) {
            throw new StopIteration()
        }
        return defaultValue
    }
    return result.value
}

/** Flattens nested arrays completely. */
export function flatten(list: unknown[]): unknown[] {
    return list.reduce<unknown[]>((acc, current) => acc.concat(Array.isArray(current) ? flatten(current) : [current]), [])
}

/**
 * Position of an item (array items compare by value), or -1 when missing.
 * For strings, the position of a substring in code points.
 */
export function index(sequence: string | Iterable<unknown>, item: unknown): number {
    if (typeof sequence === 'string') {
        const i = sequence.indexOf(item as string)
        return i === -1 || !hasSurrogates(sequence) ? i : Array.from(sequence.slice(0, i)).length
    }
    if (sequence instanceof Range) {
        return sequence.indexOf(item)
    }
    return iterableArray(sequence).findIndex((element) => deepEquals(element, item))
}

export function first<T>(array: ArrayLike<T>): T | undefined {
    return array[0]
}

export function last<T>(array: ArrayLike<T>): T | undefined {
    return array[array.length - 1]
}

/**
 * Python slicing: seq[start:stop:step] with negative indexes and steps.
 * Works on arrays, strings (by code point) and ranges; null means "omitted".
 */
export function slice(sequence: string, start?: number | null, stop?: number | null, step?: number | null): string
export function slice(sequence: Range, start?: number | null, stop?: number | null, step?: number | null): Range
export function slice<T>(sequence: ArrayLike<T>, start?: number | null, stop?: number | null, step?: number | null): T[]
export function slice(sequence: unknown, start?: number | null, stop?: number | null, step?: number | null): unknown {
    if (sequence instanceof Range) {
        return sequence.slice(start, stop, step)
    }
    const isString = typeof sequence === 'string'
    const items: ArrayLike<unknown> = isString
        ? hasSurrogates(sequence as string)
            ? Array.from(sequence as string)
            : (sequence as string)
        : (sequence as ArrayLike<unknown>)
    if (items === null || items === undefined || typeof items.length !== 'number') {
        throw new TypeError(`'${typeName(sequence)}' object is not subscriptable`)
    }
    const [lo, , st, count] = adjustSlice(items.length, start, stop, step)
    const result: unknown[] = []
    for (let i = 0, j = lo; i < count; i++, j += st) {
        result.push(items[j])
    }
    return isString ? result.join('') : result
}

// ---------------------------------------------------------------------------
// set-like helpers (return new arrays)
// ---------------------------------------------------------------------------

/** A new array without any occurrence of `item`. */
export function remove<T>(array: T[], item: T): T[] {
    return array.filter((element) => element !== item)
}

/** A new array without any of `values`. */
export function without<T>(list: T[], ...values: T[]): T[] {
    return list.filter((item) => !values.includes(item))
}

/** Items of `a` that are not in `b`. */
export function difference<T>(a: T[], b: T[]): T[] {
    return a.filter((element) => !b.includes(element))
}

/** Unique items from all lists, in order. */
export function union<T>(...lists: T[][]): T[] {
    return [...new Set(([] as T[]).concat(...lists))]
}

/** Unique items common to all lists, in order. */
export function intersection<T>(...lists: T[][]): T[] {
    if (lists.length === 0) {
        return []
    }
    return [...new Set(lists.reduce((common, list) => common.filter((value) => list.includes(value))))]
}

/** Items without duplicates, order kept. */
export function unique<T>(list: Iterable<T>): T[] {
    return [...new Set(list)]
}

// ---------------------------------------------------------------------------
// list and dict methods (modify in place, like Python)
// ---------------------------------------------------------------------------

/** list.append(item) */
export function append<T>(array: T[], item: T): void {
    array.push(item)
}

/** list.extend(iterable) */
export function extend<T>(array: T[], iterable: Iterable<T>): void {
    for (const item of iterableArray(iterable)) {
        array.push(item)
    }
}

/** list.insert(index, item) */
export function insert<T>(array: T[], index: number, item: T): void {
    array.splice(index, 0, item)
}

/**
 * list.pop(index = -1) for arrays (raises IndexError when empty or out of
 * range), or dict.pop(key, default) for objects and Maps (raises KeyError).
 */
export function pop<T>(array: T[], index?: number): T
export function pop<V, D = V>(mapping: Mapping<V>, key: unknown, defaultValue?: D): V | D
export function pop(container: unknown, index?: unknown, ...rest: unknown[]): unknown {
    if (Array.isArray(container)) {
        if (container.length === 0) {
            throw new IndexError('pop from empty list')
        }
        if (index === undefined) {
            return container.pop()
        }
        checkInteger(index, 'pop')
        const n = Number(index)
        const i = n < 0 ? container.length + n : n
        if (i < 0 || i >= container.length) {
            throw new IndexError('pop index out of range')
        }
        return container.splice(i, 1)[0]
    }
    if (container instanceof Map) {
        if (container.has(index)) {
            const value = container.get(index)
            container.delete(index)
            return value
        }
    } else if (container !== null && typeof container === 'object') {
        const object = container as Record<string, unknown>
        if (Object.hasOwn(object, index as string)) {
            const value = object[index as string]
            delete object[index as string]
            return value
        }
    } else {
        throw new TypeError(`'${typeName(container)}' object has no attribute 'pop'`)
    }
    if (rest.length > 0) {
        return rest[0]
    }
    throw new KeyError(String(index))
}

/** Empties an array, Map, Set or object in place. */
export function clear(object: unknown[] | Map<unknown, unknown> | Set<unknown> | Record<string, unknown>): void {
    if (Array.isArray(object)) {
        object.splice(0, object.length)
    } else if (object instanceof Map || object instanceof Set) {
        object.clear()
    } else {
        for (const k of Object.keys(object)) {
            delete object[k]
        }
    }
}

/**
 * Occurrences of an item in an array (compared by value), or non-overlapping
 * occurrences of a substring, like str.count.
 */
export function count(sequence: string | Iterable<unknown>, item: unknown): number {
    if (typeof sequence === 'string') {
        if (typeof item !== 'string') {
            throw new TypeError(`must be str, not ${typeName(item)}`)
        }
        if (item === '') {
            return len(sequence) + 1
        }
        return sequence.split(item).length - 1
    }
    if (!isIterable(sequence)) {
        throw notIterable(sequence)
    }
    let total = 0
    for (const current of sequence) {
        if (deepEquals(current, item)) {
            total++
        }
    }
    return total
}

// ---------------------------------------------------------------------------
// objects
// ---------------------------------------------------------------------------

/** dict.keys() for objects and Maps. */
export function keys<K>(object: Map<K, unknown>): K[]
export function keys(object: object): string[]
export function keys(object: object): unknown[] {
    return object instanceof Map ? Array.from(object.keys()) : Object.keys(object)
}

/** dict.values() for objects and Maps. */
export function values<V>(object: Map<unknown, V> | Record<string, V>): V[] {
    return object instanceof Map ? Array.from(object.values()) : Object.values(object)
}

/** dict.items() for objects and Maps. */
export function items<K, V>(object: Map<K, V>): [K, V][]
export function items<V>(object: Record<string, V>): [string, V][]
export function items(object: object): [unknown, unknown][] {
    return object instanceof Map ? Array.from(object.entries()) : Object.entries(object)
}

/** true for null, undefined, and empty strings, arrays, objects, Maps and Sets. */
export function is_empty(object: unknown): boolean {
    if (object === null || object === undefined) {
        return true
    }
    if (typeof object === 'string' || Array.isArray(object) || object instanceof Range) {
        return object.length === 0
    }
    if (object instanceof Map || object instanceof Set) {
        return object.size === 0
    }
    return Object.keys(object).length === 0
}

/** A shallow copy of an array, object (keeping its class), Date, Map, Set or typed array. */
export function copy<T>(object: T): T {
    const custom = (object as {__copy__?: () => T} | null)?.__copy__
    if (typeof custom === 'function') {
        return custom.call(object)
    }
    if (Array.isArray(object)) {
        return object.slice() as T
    }
    if (object instanceof Map) {
        return new Map(object) as T
    }
    if (object instanceof Set) {
        return new Set(object) as T
    }
    if (object === null || typeof object !== 'object') {
        return object
    }
    if (object instanceof Date) {
        return new Date(object.getTime()) as T
    }
    if (object instanceof RegExp) {
        return new RegExp(object.source, object.flags) as T
    }
    if (ArrayBuffer.isView(object) || object instanceof ArrayBuffer) {
        return (object as unknown as {slice(n: number): T}).slice(0)
    }
    return Object.assign(Object.create(Object.getPrototypeOf(object)), object)
}

/** A deep copy that keeps Dates, Maps, Sets, RegExps, typed arrays, classes and circular references. */
export function deepcopy<T>(object: T, memo: Map<unknown, unknown> = new Map()): T {
    if (object === null || typeof object !== 'object') {
        return object
    }
    if (memo.has(object)) {
        return memo.get(object) as T
    }
    if (object instanceof Date || object instanceof RegExp || ArrayBuffer.isView(object) || object instanceof ArrayBuffer) {
        const result = copy(object)
        memo.set(object, result)
        return result
    }
    if (object instanceof Map) {
        const result = new (object.constructor as MapConstructor)()
        memo.set(object, result)
        for (const [k, v] of object) {
            result.set(deepcopy(k, memo), deepcopy(v, memo))
        }
        for (const k of Object.keys(object)) {
            ;(result as unknown as Record<string, unknown>)[k] = deepcopy((object as unknown as Record<string, unknown>)[k], memo)
        }
        return result as T
    }
    if (object instanceof Set) {
        const result = new Set()
        memo.set(object, result)
        for (const v of object) {
            result.add(deepcopy(v, memo))
        }
        return result as T
    }
    const make = (object.constructor as {_make?: (items: Iterable<unknown>) => T})?._make
    if (Array.isArray(object) && object.constructor !== Array && typeof make === 'function') {
        // namedtuples are frozen, so build a new one from deep-copied fields
        const result = make.call(
            object.constructor,
            object.map((item) => deepcopy(item, memo)),
        )
        memo.set(object, result)
        return result
    }
    const result = Array.isArray(object) ? [] : Object.create(Object.getPrototypeOf(object))
    memo.set(object, result)
    for (const k of Object.keys(object)) {
        result[k] = deepcopy((object as Record<string, unknown>)[k], memo)
    }
    return result
}

/** Deep equality that ignores key order, like == on Python lists and dicts. */
export function equals(a: unknown, b: unknown): boolean {
    return deepEquals(a, b)
}

/** obj[name], or `defaultValue` when the attribute is missing. */
export function getattr<T = unknown>(obj: unknown, name: PropertyKey, ...defaultValue: [T?]): T {
    if (defaultValue.length > 0 && !hasattr(obj, name)) {
        return defaultValue[0] as T
    }
    return (obj as Record<PropertyKey, T>)[name]
}

/** obj[name] = value */
export function setattr(obj: object, name: PropertyKey, value: unknown): void {
    ;(obj as Record<PropertyKey, unknown>)[name] = value
}

/** Whether the attribute exists; works on primitives. */
export function hasattr(obj: unknown, name: PropertyKey): boolean {
    return obj !== null && obj !== undefined && name in Object(obj)
}

/** delete obj[name] */
export function delattr(obj: object, name: PropertyKey): void {
    delete (obj as Record<PropertyKey, unknown>)[name]
}

/** Swaps keys and values. */
export function invert(object: Record<string, PropertyKey>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [k, v] of Object.entries(object)) {
        result[String(v)] = k
    }
    return result
}
