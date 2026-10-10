/**
 * Python's collections module: Counter, defaultdict, deque, OrderedDict and
 * namedtuple. The dict-like classes extend Map, so they work anywhere a Map does.
 */

import {IndexError, KeyError, ValueError} from './errors.js'
import {checkInteger, compare, equals, isIterable, isPlainObject, pyRepr, typeName} from './internal.js'

function notIterable(x: unknown): TypeError {
    return new TypeError(`'${typeName(x)}' object is not iterable`)
}

/** Python's dict repr of a Map's entries: {'a': 1, 'b': 2}. */
function dictRepr(entries: Iterable<readonly [unknown, unknown]>): string {
    return `{${Array.from(entries, ([k, v]) => `${pyRepr(k)}: ${pyRepr(v)}`).join(', ')}}`
}

/** Entries of a Map or a plain object; null for anything else. */
function mappingEntries<K, V>(x: unknown): Iterable<readonly [K, V]> | null {
    if (x instanceof Map) {
        return x.entries() as Iterable<readonly [K, V]>
    }
    if (isPlainObject(x)) {
        return Object.entries(x) as unknown as Iterable<readonly [K, V]>
    }
    return null
}

/** The class name for repr: bundlers may rename the built-in classes, but not their subclasses' names. */
function className(object: object, base: Function, name: string): string {
    return object.constructor === base ? name : object.constructor.name
}

function mapEquals(a: Map<unknown, unknown>, b: unknown): boolean {
    if (isPlainObject(b)) {
        b = new Map(Object.entries(b))
    }
    if (!(b instanceof Map) || a.size !== b.size) {
        return false
    }
    for (const [k, v] of a) {
        if (!b.has(k) || !equals(v, b.get(k))) {
            return false
        }
    }
    return true
}

// ---------------------------------------------------------------------------
// Counter
// ---------------------------------------------------------------------------

/** What a Counter can be built or updated from: items to count, or a mapping of counts. */
export type CounterSource<K> = Iterable<K> | ReadonlyMap<K, number> | (K extends string ? Record<K, number> : never)

/**
 * A Map from items to counts, like Python's collections.Counter. get() returns
 * 0 for missing items without adding them. Counts may be zero or negative.
 */
export class Counter<K = string> extends Map<K, number> {
    /** Counts the items of an iterable (a string counts its characters), or copies a mapping of counts. */
    constructor(source?: CounterSource<K> | null) {
        super()
        if (source !== undefined && source !== null) {
            this.update(source)
        }
    }

    /** The count of key, 0 when missing (missing keys are not inserted). */
    override get(key: K): number {
        return super.get(key) ?? 0
    }

    /** Adds counts in place: from an iterable (one per item) or a mapping of counts. */
    update(source?: CounterSource<K> | null): this {
        this.combine(source, 1)
        return this
    }

    /** Subtracts counts in place, like update() but subtracting. Counts can go negative. */
    subtract(source?: CounterSource<K> | null): this {
        this.combine(source, -1)
        return this
    }

    private combine(source: unknown, sign: 1 | -1): void {
        if (source === undefined || source === null) {
            return
        }
        const entries = mappingEntries<K, number>(source)
        if (entries) {
            for (const [k, count] of entries) {
                this.set(k, sign === 1 ? count + this.get(k) : this.get(k) - count)
            }
            return
        }
        if (!isIterable(source)) {
            throw notIterable(source)
        }
        for (const k of source as Iterable<K>) {
            this.set(k, this.get(k) + sign)
        }
    }

    /**
     * [item, count] pairs, most common first; ties keep insertion order, like
     * CPython. With n, only the first n.
     */
    most_common(n?: number | null): [K, number][] {
        const items = Array.from(this.entries())
        const order = items.map((_, i) => i)
        order.sort((i, j) => compare(items[j][1], items[i][1]))
        const sorted = order.map((i) => items[i])
        return n === undefined || n === null ? sorted : sorted.slice(0, Math.max(0, n))
    }

    /** Each item repeated as many times as its count (items with counts below 1 are skipped). */
    *elements(): Generator<K, void, undefined> {
        for (const [k, count] of this) {
            if (!Number.isInteger(count)) {
                throw new TypeError(`'${typeName(count)}' object cannot be interpreted as an integer`)
            }
            for (let i = 0; i < count; i++) {
                yield k
            }
        }
    }

    /** The sum of all counts. */
    total(): number {
        let sum = 0
        for (const count of this.values()) {
            sum += count
        }
        return sum
    }

    /** A new Counter with the same counts. */
    copy(): Counter<K> {
        return this.__copy__()
    }

    /** Python's c + d: adds counts, keeping only positive results. */
    plus(other: ReadonlyMap<K, number>): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            const n = count + (other.get(k) ?? 0)
            if (n > 0) {
                result.set(k, n)
            }
        }
        for (const [k, count] of other) {
            if (!this.has(k) && count > 0) {
                result.set(k, count)
            }
        }
        return result
    }

    /** Python's c - d: subtracts counts, keeping only positive results. */
    minus(other: ReadonlyMap<K, number>): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            const n = count - (other.get(k) ?? 0)
            if (n > 0) {
                result.set(k, n)
            }
        }
        for (const [k, count] of other) {
            if (!this.has(k) && count < 0) {
                result.set(k, 0 - count)
            }
        }
        return result
    }

    /** Python's c | d: the maximum of each count, keeping only positive results. */
    or(other: ReadonlyMap<K, number>): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            const otherCount = other.get(k) ?? 0
            const n = count < otherCount ? otherCount : count
            if (n > 0) {
                result.set(k, n)
            }
        }
        for (const [k, count] of other) {
            if (!this.has(k) && count > 0) {
                result.set(k, count)
            }
        }
        return result
    }

    /** Python's c & d: the minimum of each count, keeping only positive results. */
    and(other: ReadonlyMap<K, number>): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            const otherCount = other.get(k) ?? 0
            const n = count < otherCount ? count : otherCount
            if (n > 0) {
                result.set(k, n)
            }
        }
        return result
    }

    /** Python's +c: only the positive counts. */
    pos(): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            if (count > 0) {
                result.set(k, count)
            }
        }
        return result
    }

    /** Python's -c: the negative counts, negated. */
    neg(): Counter<K> {
        const result = new Counter<K>()
        for (const [k, count] of this) {
            if (count < 0) {
                result.set(k, 0 - count)
            }
        }
        return result
    }

    /** Python's ==: missing items count as zero when both sides are Counters. */
    __eq__(other: unknown): boolean {
        if (other instanceof Counter) {
            for (const c of [this, other] as Counter<unknown>[]) {
                for (const k of c.keys()) {
                    if (!equals(this.get(k as K), other.get(k))) {
                        return false
                    }
                }
            }
            return true
        }
        return mapEquals(this, other)
    }

    /** A new Counter with the same counts. */
    __copy__(): Counter<K> {
        const result = new (this.constructor as typeof Counter<K>)()
        for (const [k, v] of this) {
            result.set(k, v)
        }
        return result
    }

    /** Python's repr: Counter({'a': 2, 'b': 1}), most common first. */
    __repr__(): string {
        const name = className(this, Counter, 'Counter')
        if (this.size === 0) {
            return `${name}()`
        }
        let entries: Iterable<[K, number]>
        try {
            entries = this.most_common()
        } catch {
            entries = this.entries()
        }
        return `${name}(${dictRepr(entries)})`
    }

    /** The counts as a plain object (keys converted to strings). */
    toJSON(): Record<string, number> {
        return Object.fromEntries(Array.from(this, ([k, v]) => [String(k), v]))
    }

    override toString(): string {
        return this.__repr__()
    }
}

// ---------------------------------------------------------------------------
// defaultdict
// ---------------------------------------------------------------------------

/** Entries for a dict-like Map: [key, value] pairs, a Map, or a plain object. */
export type MapSource<K, V> = Iterable<readonly [K, V]> | ReadonlyMap<K, V> | (K extends string ? Record<K, V> : never)

function fill<K, V>(map: Map<K, V>, source: unknown): void {
    if (source === undefined || source === null) {
        return
    }
    const entries = mappingEntries<K, V>(source)
    if (entries) {
        for (const [k, v] of entries) {
            map.set(k, v)
        }
        return
    }
    if (!isIterable(source)) {
        throw notIterable(source)
    }
    for (const entry of source as Iterable<unknown>) {
        if (!isIterable(entry) || typeof entry === 'string') {
            throw new TypeError(`cannot convert dictionary update sequence element; '${typeName(entry)}' object is not a [key, value] pair`)
        }
        const pair = Array.from(entry)
        if (pair.length !== 2) {
            throw new ValueError(`dictionary update sequence element has length ${pair.length}; 2 is required`)
        }
        map.set(pair[0] as K, pair[1] as V)
    }
}

/**
 * A Map whose get(key) works like Python's d[key]: a missing key is set to
 * default_factory() and returned (KeyError when default_factory is null).
 * has() never inserts.
 */
export class defaultdict<K, V> extends Map<K, V> {
    /** Called with no arguments to make the value for a missing key; null raises KeyError instead. */
    default_factory: (() => V) | null

    /** defaultdict(() => [], entries) */
    constructor(default_factory?: (() => V) | null, entries?: MapSource<K, V> | null) {
        super()
        if (default_factory !== undefined && default_factory !== null && typeof default_factory !== 'function') {
            throw new TypeError('first argument must be callable or None')
        }
        this.default_factory = default_factory ?? null
        fill(this, entries)
    }

    /** d[key]: the value, inserting default_factory() when missing. KeyError without a factory. */
    override get(key: K): V {
        if (super.has(key)) {
            return super.get(key) as V
        }
        return this.__missing__(key)
    }

    /** Called by get() for a missing key. */
    __missing__(key: K): V {
        if (this.default_factory === null) {
            throw new KeyError(pyRepr(key))
        }
        const value = this.default_factory()
        this.set(key, value)
        return value
    }

    /** A shallow copy with the same default_factory. */
    copy(): defaultdict<K, V> {
        return this.__copy__()
    }

    /** A shallow copy with the same default_factory. */
    __copy__(): defaultdict<K, V> {
        return new (this.constructor as typeof defaultdict<K, V>)(this.default_factory, this)
    }

    /** Python's repr: defaultdict(<function list>, {'a': [1]}). */
    __repr__(): string {
        return `${className(this, defaultdict, 'defaultdict')}(${pyRepr(this.default_factory)}, ${dictRepr(this)})`
    }

    /** The entries as a plain object (keys converted to strings). */
    toJSON(): Record<string, V> {
        return Object.fromEntries(Array.from(this, ([k, v]) => [String(k), v]))
    }

    override toString(): string {
        return this.__repr__()
    }
}

// ---------------------------------------------------------------------------
// OrderedDict
// ---------------------------------------------------------------------------

/** A Map with Python's OrderedDict methods. Equality with another OrderedDict is order-sensitive. */
export class OrderedDict<K, V> extends Map<K, V> {
    /** OrderedDict(entries) */
    constructor(entries?: MapSource<K, V> | null) {
        super()
        fill(this, entries)
    }

    /**
     * Moves an existing key to the end (or to the start when last is false).
     * KeyError when missing. Moving to the start is O(n).
     */
    move_to_end(key: K, last = true): void {
        if (!this.has(key)) {
            throw new KeyError(pyRepr(key))
        }
        const value = super.get(key) as V
        if (last) {
            this.delete(key)
            this.set(key, value)
            return
        }
        const rest = Array.from(this).filter(([k]) => k !== key)
        this.clear()
        this.set(key, value)
        for (const [k, v] of rest) {
            this.set(k, v)
        }
    }

    /** Removes and returns the last [key, value] pair (the first when last is false). KeyError when empty. */
    popitem(last = true): [K, V] {
        if (this.size === 0) {
            throw new KeyError('dictionary is empty')
        }
        let entry: [K, V] | undefined
        if (last) {
            for (entry of this) {
                // walk to the last entry
            }
        } else {
            entry = this.entries().next().value
        }
        const [k, v] = entry as [K, V]
        this.delete(k)
        return [k, v]
    }

    /** A shallow copy. */
    copy(): OrderedDict<K, V> {
        return this.__copy__()
    }

    /** A shallow copy. */
    __copy__(): OrderedDict<K, V> {
        return new (this.constructor as typeof OrderedDict<K, V>)(this)
    }

    /** Order-sensitive against another OrderedDict, order-insensitive against other Maps. */
    __eq__(other: unknown): boolean {
        if (other instanceof OrderedDict) {
            if (this.size !== other.size) {
                return false
            }
            const b = Array.from(other as OrderedDict<unknown, unknown>)
            let i = 0
            for (const [k, v] of this) {
                if (!equals(k, b[i][0]) || !equals(v, b[i][1])) {
                    return false
                }
                i++
            }
            return true
        }
        return mapEquals(this, other)
    }

    /** Python's repr: OrderedDict({'a': 1}). */
    __repr__(): string {
        const name = className(this, OrderedDict, 'OrderedDict')
        return this.size === 0 ? `${name}()` : `${name}(${dictRepr(this)})`
    }

    /** The entries as a plain object (keys converted to strings). */
    toJSON(): Record<string, V> {
        return Object.fromEntries(Array.from(this, ([k, v]) => [String(k), v]))
    }

    override toString(): string {
        return this.__repr__()
    }
}

// ---------------------------------------------------------------------------
// deque
// ---------------------------------------------------------------------------

const EMPTY_DEQUE = 'pop from an empty deque'

/**
 * A double-ended queue with O(1) appends and pops at both ends (a ring
 * buffer), like Python's collections.deque. With maxlen, adding to a full
 * deque drops items from the opposite end.
 */
export class deque<T> implements Iterable<T> {
    private _buf: (T | undefined)[]
    private _head: number
    private _size: number
    private readonly _maxlen: number | null

    /** deque(iterable, maxlen) */
    constructor(iterable?: Iterable<T> | null, maxlen?: number | null) {
        if (maxlen !== undefined && maxlen !== null) {
            checkInteger(maxlen, 'deque')
            if (maxlen < 0) {
                throw new ValueError('maxlen must be non-negative')
            }
        }
        this._maxlen = maxlen ?? null
        this._buf = new Array(8)
        this._head = 0
        this._size = 0
        if (iterable !== undefined && iterable !== null) {
            this.extend(iterable)
        }
    }

    /** The number of items. */
    get length(): number {
        return this._size
    }

    /** The maximum size, or null when unbounded. */
    get maxlen(): number | null {
        return this._maxlen
    }

    private slot(i: number): number {
        return (this._head + i) & (this._buf.length - 1)
    }

    private grow(): void {
        const items = this.toArray()
        this._buf = new Array(this._buf.length * 2)
        for (let i = 0; i < items.length; i++) {
            this._buf[i] = items[i]
        }
        this._head = 0
    }

    private load(items: T[]): void {
        let capacity = 8
        while (capacity < items.length) {
            capacity *= 2
        }
        this._buf = new Array(capacity)
        for (let i = 0; i < items.length; i++) {
            this._buf[i] = items[i]
        }
        this._head = 0
        this._size = items.length
    }

    private checkIndex(i: number): number {
        checkInteger(i, 'deque')
        const index = i < 0 ? i + this._size : i
        if (index < 0 || index >= this._size) {
            throw new IndexError('deque index out of range')
        }
        return index
    }

    /** Adds x to the right end. */
    append(x: T): void {
        if (this._maxlen === 0) {
            return
        }
        if (this._size === this._maxlen) {
            this.popleft()
        }
        if (this._size === this._buf.length) {
            this.grow()
        }
        this._buf[this.slot(this._size)] = x
        this._size++
    }

    /** Adds x to the left end. */
    appendleft(x: T): void {
        if (this._maxlen === 0) {
            return
        }
        if (this._size === this._maxlen) {
            this.pop()
        }
        if (this._size === this._buf.length) {
            this.grow()
        }
        this._head = (this._head - 1) & (this._buf.length - 1)
        this._buf[this._head] = x
        this._size++
    }

    /** Removes and returns the rightmost item. IndexError when empty. */
    pop(): T {
        if (this._size === 0) {
            throw new IndexError(EMPTY_DEQUE)
        }
        const i = this.slot(this._size - 1)
        const x = this._buf[i] as T
        this._buf[i] = undefined
        this._size--
        return x
    }

    /** Removes and returns the leftmost item. IndexError when empty. */
    popleft(): T {
        if (this._size === 0) {
            throw new IndexError(EMPTY_DEQUE)
        }
        const x = this._buf[this._head] as T
        this._buf[this._head] = undefined
        this._head = (this._head + 1) & (this._buf.length - 1)
        this._size--
        return x
    }

    /** Appends each item of the iterable to the right end. */
    extend(iterable: Iterable<T>): void {
        if (!isIterable(iterable)) {
            throw notIterable(iterable)
        }
        for (const x of iterable === this ? this.toArray() : iterable) {
            this.append(x)
        }
    }

    /** Appends each item to the left end, so they end up in reverse order. */
    extendleft(iterable: Iterable<T>): void {
        if (!isIterable(iterable)) {
            throw notIterable(iterable)
        }
        for (const x of iterable === this ? this.toArray() : iterable) {
            this.appendleft(x)
        }
    }

    /** Rotates n steps to the right (to the left when n is negative). */
    rotate(n = 1): void {
        checkInteger(n, 'rotate')
        const len = this._size
        if (len <= 1) {
            return
        }
        const k = ((Number(n) % len) + len) % len
        if (k <= len / 2) {
            for (let i = 0; i < k; i++) {
                this.appendleft(this.pop())
            }
        } else {
            for (let i = 0; i < len - k; i++) {
                this.append(this.popleft())
            }
        }
    }

    /** Removes all items. */
    clear(): void {
        this._buf = new Array(8)
        this._head = 0
        this._size = 0
    }

    /** The number of items equal to x. */
    count(x: T): number {
        let n = 0
        for (const item of this) {
            if (equals(item, x)) {
                n++
            }
        }
        return n
    }

    /** Whether some item equals x (Python's `x in d`). */
    includes(x: T): boolean {
        for (const item of this) {
            if (equals(item, x)) {
                return true
            }
        }
        return false
    }

    /** The index of the first item equal to x within [start, stop). ValueError when absent. */
    index(x: T, start = 0, stop: number = this._size): number {
        const n = this._size
        if (start < 0) {
            start = Math.max(0, start + n)
        }
        if (stop < 0) {
            stop = Math.max(0, stop + n)
        }
        stop = Math.min(stop, n)
        for (let i = start; i < stop; i++) {
            if (equals(this._buf[this.slot(i)], x)) {
                return i
            }
        }
        throw new ValueError(`${pyRepr(x)} is not in deque`)
    }

    /** Inserts x before position i, like list.insert. IndexError when the deque is at maxlen. */
    insert(i: number, x: T): void {
        checkInteger(i, 'insert')
        if (this._size === this._maxlen) {
            throw new IndexError('deque already at its maximum size')
        }
        const items = this.toArray()
        let index = i < 0 ? Math.max(0, i + items.length) : Math.min(i, items.length)
        index = Number(index)
        items.splice(index, 0, x)
        this.load(items)
    }

    /** Removes the first item equal to x. ValueError when absent. */
    remove(x: T): void {
        const items = this.toArray()
        const i = items.findIndex((item) => equals(item, x))
        if (i === -1) {
            throw new ValueError(`${pyRepr(x)} is not in deque`)
        }
        items.splice(i, 1)
        this.load(items)
    }

    /** Reverses the items in place. */
    reverse(): void {
        for (let i = 0, j = this._size - 1; i < j; i++, j--) {
            const a = this.slot(i)
            const b = this.slot(j)
            const tmp = this._buf[a]
            this._buf[a] = this._buf[b]
            this._buf[b] = tmp
        }
    }

    /** d[i], with negative indexes counting from the right. IndexError when out of range. */
    at(i: number): T {
        return this._buf[this.slot(this.checkIndex(i))] as T
    }

    /** d[i] = value. IndexError when out of range. */
    set(i: number, value: T): void {
        this._buf[this.slot(this.checkIndex(i))] = value
    }

    /** A shallow copy with the same maxlen. */
    copy(): deque<T> {
        return new (this.constructor as typeof deque<T>)(this, this._maxlen)
    }

    /** The items from left to right. */
    *[Symbol.iterator](): Iterator<T> {
        for (let i = 0; i < this._size; i++) {
            yield this._buf[this.slot(i)] as T
        }
    }

    /** The items as an array, left to right. */
    toArray(): T[] {
        const out = new Array<T>(this._size)
        for (let i = 0; i < this._size; i++) {
            out[i] = this._buf[this.slot(i)] as T
        }
        return out
    }

    /** The items as an array. */
    toJSON(): T[] {
        return this.toArray()
    }

    /** Python's repr: deque([1, 2], maxlen=3). */
    __repr__(): string {
        const name = className(this, deque, 'deque')
        const items = pyRepr(this.toArray())
        return this._maxlen === null ? `${name}(${items})` : `${name}(${items}, maxlen=${this._maxlen})`
    }

    /** Python's repr. */
    toString(): string {
        return this.__repr__()
    }

    /** len(d) */
    __len__(): number {
        return this._size
    }

    /** bool(d): false when empty. */
    __bool__(): boolean {
        return this._size > 0
    }

    /** copy(d) */
    __copy__(): deque<T> {
        return this.copy()
    }

    /** Equal to another deque with equal items (maxlen is ignored). */
    __eq__(other: unknown): boolean {
        if (!(other instanceof deque) || other.length !== this._size) {
            return false
        }
        let i = 0
        for (const x of other as deque<unknown>) {
            if (!equals(this._buf[this.slot(i)], x)) {
                return false
            }
            i++
        }
        return true
    }

    /** Deques compare lexicographically, like Python's sequences. */
    __lt__(other: unknown): boolean {
        if (!(other instanceof deque)) {
            throw new TypeError(`'<' not supported between instances of 'deque' and '${typeName(other)}'`)
        }
        return compare(this.toArray(), (other as deque<unknown>).toArray()) < 0
    }
}

// ---------------------------------------------------------------------------
// namedtuple
// ---------------------------------------------------------------------------

/** Methods and properties of namedtuple instances. */
export interface NamedTupleMethods<F extends string, V> {
    /** The field names. */
    readonly _fields: readonly F[]
    /** A plain object from field names to values. */
    _asdict(): Record<F, V>
    /** A new instance with some fields replaced. TypeError for unknown field names, like Python 3.13+. */
    _replace(changes: Partial<Record<F, V>>): NamedTuple<F, V>
    /** Python's repr: Point(x=1, y=2). */
    __repr__(): string
    /** Tuple equality with another namedtuple or array. */
    __eq__(other: unknown): boolean
    /** Tuple ordering. */
    __lt__(other: unknown): boolean
    /** copy(p): the same instance, since it is immutable. */
    __copy__(): NamedTuple<F, V>
}

/** An instance of a namedtuple class: a frozen array with named getters. */
export type NamedTuple<F extends string, V = any> = ReadonlyArray<V> & {readonly [P in F]: V} & NamedTupleMethods<F, V>

/** A class made by namedtuple(). */
export interface NamedTupleClass<F extends string, V = any> {
    new (...values: V[]): NamedTuple<F, V>
    readonly prototype: NamedTuple<F, V>
    /** The field names. */
    readonly _fields: readonly F[]
    /** Default values by field name. */
    readonly _field_defaults: Partial<Record<F, V>>
    /** An instance from an iterable with exactly one value per field. */
    _make(iterable: Iterable<V>): NamedTuple<F, V>
}

/** Options for namedtuple(). */
export interface NamedTupleOptions<V = any> {
    /** Default values for the rightmost fields. */
    defaults?: Iterable<V> | null
    /** Replace invalid or duplicate field names with _0, _1, ... instead of raising ValueError. */
    rename?: boolean
}

const PY_KEYWORDS = new Set(
    'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(
        ' ',
    ),
)
// names that would break the underlying Array (namedtuples are arrays)
const RESERVED = new Set(['length', 'constructor'])

const isIdentifier = (s: string) => /^[\p{L}\p{Nl}_][\p{L}\p{Nl}\p{Mn}\p{Mc}\p{Nd}\p{Pc}]*$/u.test(s)

/**
 * A tuple class with named fields, like Python's collections.namedtuple.
 * Instances are frozen arrays (so they destructure, index, compare and
 * JSON-serialise like tuples) with a getter per field:
 *
 *   const Point = namedtuple('Point', ['x', 'y'])
 *   const p = new Point(1, 2)   // p.x === 1, p[1] === 2
 *
 * Unlike Python, the field names 'length' and 'constructor' are rejected
 * (ValueError), and fields named like Array methods shadow those methods.
 */
export function namedtuple<const F extends string, V = any>(typename: string, fieldNames: readonly F[], options?: NamedTupleOptions<V>): NamedTupleClass<F, V>
export function namedtuple<V = any>(typename: string, fieldNames: string, options?: NamedTupleOptions<V>): NamedTupleClass<string, V>
export function namedtuple(typename: string, fieldNames: string | readonly string[], options: NamedTupleOptions = {}): NamedTupleClass<string> {
    let fields: string[] =
        typeof fieldNames === 'string'
            ? fieldNames
                  .replace(/,/g, ' ')
                  .split(/\s+/)
                  .filter((s) => s !== '')
            : Array.from(fieldNames, String)
    const rename = Boolean(options.rename)
    if (rename) {
        const seen = new Set<string>()
        fields = fields.map((name, index) => {
            const bad = !isIdentifier(name) || PY_KEYWORDS.has(name) || name.startsWith('_') || seen.has(name) || RESERVED.has(name)
            seen.add(name)
            return bad ? `_${index}` : name
        })
    }
    for (const name of [typename, ...fields]) {
        if (typeof name !== 'string') {
            throw new TypeError('Type names and field names must be strings')
        }
        if (!isIdentifier(name)) {
            throw new ValueError(`Type names and field names must be valid identifiers: ${pyRepr(name)}`)
        }
        if (PY_KEYWORDS.has(name)) {
            throw new ValueError(`Type names and field names cannot be a keyword: ${pyRepr(name)}`)
        }
    }
    const seen = new Set<string>()
    for (const name of fields) {
        if (name.startsWith('_') && !rename) {
            throw new ValueError(`Field names cannot start with an underscore: ${pyRepr(name)}`)
        }
        if (seen.has(name)) {
            throw new ValueError(`Encountered duplicate field name: ${pyRepr(name)}`)
        }
        if (RESERVED.has(name)) {
            throw new ValueError(`Field name ${pyRepr(name)} is reserved by JavaScript arrays`)
        }
        seen.add(name)
    }
    const defaults = options.defaults === undefined || options.defaults === null ? [] : Array.from(options.defaults)
    if (defaults.length > fields.length) {
        throw new TypeError('Got more default values than field names')
    }
    const fieldDefaults: Record<string, unknown> = {}
    fields.slice(fields.length - defaults.length).forEach((name, i) => {
        fieldDefaults[name] = defaults[i]
    })
    const n = fields.length
    const required = n - defaults.length
    const frozenFields = Object.freeze(fields.slice())

    const cls = class extends Array<unknown> {
        static get [Symbol.species]() {
            return Array
        }

        static readonly _fields = frozenFields
        static readonly _field_defaults = Object.freeze({...fieldDefaults})

        constructor(...values: unknown[]) {
            super()
            const name = new.target.name
            if (values.length > n) {
                const takes = required === n ? `${n + 1}` : `from ${required + 1} to ${n + 1}`
                throw new TypeError(`${name}.__new__() takes ${takes} positional arguments but ${values.length + 1} were given`)
            }
            if (values.length < required) {
                const missing = fields.slice(values.length, required).map((f) => pyRepr(f))
                const list = missing.length === 1 ? missing[0] : `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}`
                throw new TypeError(
                    `${name}.__new__() missing ${missing.length} required positional argument${missing.length === 1 ? '' : 's'}: ${list}`,
                )
            }
            for (let i = 0; i < n; i++) {
                Array.prototype.push.call(this, i < values.length ? values[i] : fieldDefaults[fields[i]])
            }
            Object.freeze(this)
        }

        static _make(iterable: Iterable<unknown>): NamedTuple<string> {
            if (!isIterable(iterable)) {
                throw notIterable(iterable)
            }
            const values = Array.from(iterable)
            if (values.length !== n) {
                throw new TypeError(`Expected ${n} arguments, got ${values.length}`)
            }
            return new this(...values) as unknown as NamedTuple<string>
        }

        get _fields(): readonly string[] {
            return frozenFields
        }

        _asdict(): Record<string, unknown> {
            const out: Record<string, unknown> = {}
            fields.forEach((f, i) => {
                out[f] = this[i]
            })
            return out
        }

        _replace(changes: Record<string, unknown>): NamedTuple<string> {
            const unexpected = Object.keys(changes).filter((k) => !fields.includes(k))
            if (unexpected.length > 0) {
                // TypeError since Python 3.13 (ValueError before)
                throw new TypeError(`Got unexpected field names: ${pyRepr(unexpected)}`)
            }
            const values = fields.map((f, i) => (Object.hasOwn(changes, f) ? changes[f] : this[i]))
            return (this.constructor as typeof cls)._make(values)
        }

        __repr__(): string {
            return `${this.constructor.name}(${fields.map((f, i) => `${f}=${pyRepr(this[i])}`).join(', ')})`
        }

        override toString(): string {
            return this.__repr__()
        }

        __eq__(other: unknown): boolean {
            return Array.isArray(other) && other.length === n && other.every((v, i) => equals(this[i], v))
        }

        __lt__(other: unknown): boolean {
            return compare(Array.from(this), other) < 0
        }

        __copy__(): this {
            return this
        }

        toJSON(): unknown[] {
            return Array.from(this)
        }
    }
    Object.defineProperty(cls, 'name', {value: typename})
    fields.forEach((field, i) => {
        Object.defineProperty(cls.prototype, field, {
            get(this: unknown[]) {
                return this[i]
            },
            configurable: true,
        })
    })
    return cls as unknown as NamedTupleClass<string>
}
