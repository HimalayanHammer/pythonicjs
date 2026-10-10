/**
 * pythonicjs - Python's built-in functions for JavaScript.
 *
 * Krishna Bhattarai
 * www.kbhattarai.com
 * July 2018, updated Nov 2023 and Oct 2026
 *
 * Works in Node.js (CommonJS) and in the browser (<script> tag).
 * Loading the library installs every function as a global, so you can write
 * `print(sum(range(10)))` just like in Python. The functions are also exported:
 *
 *   const py = require('pythonicjs')   // installs globals and returns the API
 *   const { sum, range } = require('pythonicjs')
 *   require('pythonicjs')()            // installs globals (again) and returns the API
 *
 * In the browser the API is also available as `window.pythonicjs`.
 */

(function (root, factory) {
    'use strict'
    const py = factory()

    function install(target) {
        target = target || root
        Object.keys(py).forEach(function (name) {
            target[name] = py[name]
        })
        return py
    }

    Object.keys(py).forEach(function (name) {
        install[name] = py[name]
    })
    install.install = install

    install(root)
    root.pythonicjs = install

    if (typeof module === 'object' && module && module.exports) {
        module.exports = install
    }
}(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
    'use strict'

    const py = {}

    // ---------------------------------------------------------------------
    // internal helpers
    // ---------------------------------------------------------------------

    function isIterable(object) {
        return object !== null && object !== undefined && typeof object[Symbol.iterator] === 'function'
    }

    function isPlainObject(object) {
        if (object === null || typeof object !== 'object') {
            return false
        }
        const proto = Object.getPrototypeOf(object)
        return proto === Object.prototype || proto === null
    }

    function toArray(iterable) {
        if (Array.isArray(iterable)) {
            return iterable
        }
        if (isIterable(iterable)) {
            return Array.from(iterable)
        }
        throw new TypeError('Input must be iterable')
    }

    function isNumeric(x) {
        return typeof x === 'number' || typeof x === 'bigint' || typeof x === 'boolean'
    }

    function compareStrings(a, b) {
        const n = Math.min(a.length, b.length)
        for (let i = 0; i < n; i++) {
            const ca = a.codePointAt(i)
            const cb = b.codePointAt(i)
            if (ca !== cb) {
                return ca - cb
            }
            if (ca > 0xFFFF) {
                i++
            }
        }
        return a.length - b.length
    }

    // Python-like ordering: numbers numerically, strings by code point,
    // arrays (tuples) lexicographically. Values that Python can't order
    // (e.g. a string and a number) raise a TypeError.
    function compare(a, b) {
        if (isNumeric(a) && isNumeric(b)) {
            return a < b ? -1 : (a > b ? 1 : 0)
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
                const c = compare(a[i], b[i])
                if (c !== 0) {
                    return c
                }
            }
            return a.length - b.length
        }
        throw new TypeError("'<' not supported between instances of '" + py.type(a) + "' and '" + py.type(b) + "'")
    }

    // Splits max(...)/min(...) arguments into values and options, supporting
    // max(iterable), max(a, b, ...), and a trailing {key, default} options object.
    function extremeArgs(args) {
        let options = {}
        const last = args[args.length - 1]
        if (args.length > 1 && isPlainObject(last) && ('key' in last || 'default' in last)) {
            options = last
            args = args.slice(0, -1)
        }
        let values
        if (args.length === 1) {
            if (!isIterable(args[0])) {
                throw new Error('Input must be a non-empty array')
            }
            values = toArray(args[0])
        } else {
            values = args
        }
        return {values: values, key: options.key, hasDefault: 'default' in options, default: options.default}
    }

    function extreme(args, sign) {
        const parsed = extremeArgs(args)
        if (parsed.values.length === 0) {
            if (parsed.hasDefault) {
                return parsed.default
            }
            throw new Error('Input must be a non-empty array')
        }
        const key = parsed.key || function (x) { return x }
        let best = parsed.values[0]
        let bestKey = key(best)
        for (let i = 1; i < parsed.values.length; i++) {
            const k = key(parsed.values[i])
            if (sign * compare(k, bestKey) > 0) {
                best = parsed.values[i]
                bestKey = k
            }
        }
        return best
    }

    function checkInteger(n, name) {
        if (typeof n === 'bigint') {
            return
        }
        if (typeof n !== 'number' || !Number.isInteger(n)) {
            throw new TypeError(name + '() argument must be an integer')
        }
    }

    function formatInteger(n, radix, prefix) {
        if (n < 0) {
            return '-' + prefix + (-n).toString(radix)
        }
        return prefix + n.toString(radix)
    }

    // ---------------------------------------------------------------------
    // printing and logging
    // ---------------------------------------------------------------------

    py.print = function (...message) {
        console.log(...message)
    }

    py.pprintr = function (object) {
        return JSON.stringify(object, null, 2)
    }

    py.pprint = function (object) {
        py.print(py.pprintr(object))
    }

    py.timestamp = function () {
        return new Date().toISOString()
    }

    py.log = function (...message) {
        py.print(py.timestamp(), '::==>', ...message)
    }

    // ---------------------------------------------------------------------
    // types and conversions
    // ---------------------------------------------------------------------

    py.type = function (object) {
        if (object === null) {
            return 'null'
        }
        if (Array.isArray(object)) {
            return 'array'
        }
        return typeof object
    }

    py.is_array = function (object) {
        return Array.isArray(object)
    }

    py.is_null = function (object) {
        return object === null
    }

    py.is_undefined = function (object) {
        return typeof object === 'undefined'
    }

    py.str = function (object) {
        return String(object)
    }

    py.int = function (value, base = 10) {
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) {
                throw new Error('cannot convert ' + value + ' to integer')
            }
            return Math.trunc(value) + 0
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0
        }
        if (typeof value === 'bigint') {
            return Number(value)
        }
        if (typeof value === 'string') {
            if (!Number.isInteger(base) || base !== 0 && (base < 2 || base > 36)) {
                throw new Error('int() base must be >= 2 and <= 36, or 0')
            }
            const invalid = new Error("invalid literal for int() with base " + base + ": '" + value + "'")
            let text = value.trim().toLowerCase()
            let sign = ''
            if (text[0] === '+' || text[0] === '-') {
                sign = text[0]
                text = text.slice(1)
            }
            const prefixes = {'0x': 16, '0o': 8, '0b': 2}
            const prefix = text.slice(0, 2)
            if (prefixes[prefix] && (base === 0 || base === prefixes[prefix])) {
                base = prefixes[prefix]
                text = text.slice(2).replace(/^_/, '')
            } else if (base === 0) {
                if (/^0+(_?0)*$/.test(text)) {
                    return 0
                }
                if (text[0] === '0') {
                    throw invalid
                }
                base = 10
            }
            const digits = '0123456789abcdefghijklmnopqrstuvwxyz'.slice(0, base)
            const pattern = new RegExp('^[' + digits + ']+(_[' + digits + ']+)*$')
            if (!pattern.test(text)) {
                throw invalid
            }
            return parseInt(sign + text.replace(/_/g, ''), base) + 0
        }
        throw new TypeError('int() argument must be a string, a number or a boolean')
    }

    py.float = function (value) {
        if (typeof value === 'number') {
            return value
        }
        if (typeof value === 'boolean') {
            return value ? 1 : 0
        }
        if (typeof value === 'string') {
            const text = value.trim().toLowerCase()
            if (/^[+-]?(inf|infinity)$/.test(text)) {
                return text[0] === '-' ? -Infinity : Infinity
            }
            if (/^[+-]?nan$/.test(text)) {
                return NaN
            }
            const digits = '\\d+(_\\d+)*'
            const pattern = new RegExp('^[+-]?(' + digits + '(\\.(' + digits + ')?)?|\\.' + digits + ')(e[+-]?' + digits + ')?$')
            if (pattern.test(text)) {
                return parseFloat(text.replace(/_/g, ''))
            }
            throw new Error("could not convert string to float: '" + value + "'")
        }
        throw new TypeError('float() argument must be a string or a number')
    }

    py.bool = function (object) {
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
            if (isPlainObject(object)) {
                return Object.keys(object).length > 0
            }
            return true
        }
        return Boolean(object)
    }

    py.not = function (object) {
        return !py.bool(object)
    }

    py.list = function (iterable) {
        if (iterable === undefined) {
            return []
        }
        if (isPlainObject(iterable)) {
            return Object.keys(iterable)
        }
        return Array.from(toArray(iterable))
    }

    py.chr = function (code) {
        return String.fromCodePoint(code)
    }

    py.ord = function (character) {
        if (typeof character !== 'string' || Array.from(character).length !== 1) {
            throw new TypeError('ord() expected a single character')
        }
        return character.codePointAt(0)
    }

    py.hex = function (n) {
        checkInteger(n, 'hex')
        return formatInteger(n, 16, '0x')
    }

    py.oct = function (n) {
        checkInteger(n, 'oct')
        return formatInteger(n, 8, '0o')
    }

    py.bin = function (n) {
        checkInteger(n, 'bin')
        return formatInteger(n, 2, '0b')
    }

    py.base = function (number, base) {
        return number.toString(base)
    }

    // ---------------------------------------------------------------------
    // math
    // ---------------------------------------------------------------------

    py.abs = function (number) {
        return Math.abs(number)
    }

    py.pow = function (x, y, mod) {
        if (mod === undefined) {
            return Math.pow(x, y)
        }
        // modular exponentiation for integers, like Python's pow(x, y, mod)
        checkInteger(x, 'pow')
        checkInteger(y, 'pow')
        checkInteger(mod, 'pow')
        if (Number(mod) === 0) {
            throw new Error('pow() 3rd argument cannot be 0')
        }
        if (y < 0) {
            throw new Error('pow() negative exponent is not supported with a modulus')
        }
        const m = BigInt(mod)
        let result = BigInt(1) % m
        let b = BigInt(x) % m
        let e = BigInt(y)
        while (e > 0) {
            if (e % BigInt(2) === BigInt(1)) {
                result = (result * b) % m
            }
            b = (b * b) % m
            e = e / BigInt(2)
        }
        if (result !== BigInt(0) && (result < 0) !== (m < 0)) {
            result += m
        }
        return typeof mod === 'bigint' ? result : Number(result)
    }

    py.divmod = function (a, b) {
        if (b === 0) {
            throw new Error('integer division or modulo by zero')
        }
        const q = Math.floor(a / b)
        return [q, a - q * b]
    }

    py.round = function (number, ndigits = null) {
        const result = ndigits === null ? Math.round(number) : Math.round(number * 10 ** ndigits) / 10 ** ndigits
        return result + 0
    }

    py.sum = function (list, start = 0) {
        if (!isIterable(list) || typeof list === 'string') {
            throw new Error('Input must be an array')
        }
        let total = start
        for (const item of list) {
            total = total + item
        }
        return total
    }

    py.max = function (...args) {
        return extreme(args, 1)
    }

    py.min = function (...args) {
        return extreme(args, -1)
    }

    py.avg = function (list) {
        if (!isIterable(list) || typeof list === 'string') {
            throw new Error('Input must be a non-empty array')
        }
        const values = toArray(list)
        if (values.length === 0) {
            throw new Error('Input must be a non-empty array')
        }
        return py.sum(values) / values.length
    }

    py.mean = function (list) {
        return py.avg(list)
    }

    // random(min, max) and randint(min, max) return an integer in [min, max]
    py.random = function (min, max) {
        if (typeof min !== 'number' || typeof max !== 'number') {
            throw new Error('Inputs must be numbers')
        }
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    py.randint = function (min, max) {
        return py.random(min, max)
    }

    py.choice = function (sequence) {
        const values = toArray(sequence)
        if (values.length === 0) {
            throw new Error('Cannot choose from an empty sequence')
        }
        return values[Math.floor(Math.random() * values.length)]
    }

    // shuffles the array in place (Fisher-Yates) and returns it
    py.shuffle = function (array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const tmp = array[i]
            array[i] = array[j]
            array[j] = tmp
        }
        return array
    }

    // ---------------------------------------------------------------------
    // sequences and iteration
    // ---------------------------------------------------------------------

    py.len = function (object) {
        if (typeof object === 'string' || Array.isArray(object) || ArrayBuffer.isView(object)) {
            return object.length
        }
        if (object instanceof Map || object instanceof Set) {
            return object.size
        }
        if (isPlainObject(object)) {
            return Object.keys(object).length
        }
        throw new Error('Input must be a string or an array')
    }

    py.range = function (start, stop, step = 1) {
        if (stop === undefined) {
            stop = start
            start = 0
        }
        checkInteger(start, 'range')
        checkInteger(stop, 'range')
        checkInteger(step, 'range')
        if (step === 0) {
            throw new Error('range() arg 3 must not be zero')
        }
        const length = Math.max(0, Math.ceil((stop - start) / step))
        return Array.from({length: length}, function (_, i) { return start + i * step })
    }

    // sorted(iterable, key = null, reverse = false) or sorted(iterable, {key, reverse})
    // Arrays, strings, Sets and Maps return a new sorted array.
    // Plain objects return a new object with its keys sorted.
    py.sorted = function (iterable, key = null, reverse = false) {
        if (isPlainObject(key)) {
            reverse = Boolean(key.reverse)
            key = key.key || null
        }
        const keyFn = key || function (x) { return x }
        const comparator = function (a, b) {
            const c = compare(keyFn(a), keyFn(b))
            return reverse ? -c : c
        }

        if (Array.isArray(iterable)) {
            return iterable.slice().sort(comparator)
        }
        if (isPlainObject(iterable)) {
            return Object.keys(iterable).sort(comparator).reduce(function (result, k) {
                result[k] = iterable[k]
                return result
            }, {})
        }
        if (isIterable(iterable)) {
            return Array.from(iterable).sort(comparator)
        }
        throw new Error('Unsupported iterable type')
    }

    py.reversed = function (sequence) {
        return Array.from(sequence).reverse()
    }

    py.enumerate = function (iterable, start = 0) {
        return toArray(iterable).map(function (item, i) { return [start + i, item] })
    }

    py.zip = function (...iterables) {
        if (iterables.length === 0) {
            return []
        }
        const arrays = iterables.map(toArray)
        const length = Math.min(...arrays.map(function (a) { return a.length }))
        return Array.from({length: length}, function (_, i) {
            return arrays.map(function (a) { return a[i] })
        })
    }

    // filter(null, iterable) keeps the truthy (in the Python sense) items
    py.filter = function (operation, iterable) {
        const predicate = operation === null || operation === undefined ? py.bool : operation
        return toArray(iterable).filter(function (item) { return predicate(item) })
    }

    // map(operation, iterable, ...more) works like Python's map over several iterables
    py.map = function (operation, ...iterables) {
        if (iterables.length === 1) {
            return toArray(iterables[0]).map(function (item) { return operation(item) })
        }
        return py.zip(...iterables).map(function (items) { return operation(...items) })
    }

    py.any = function (iterable) {
        for (const item of toArray(iterable)) {
            if (py.bool(item)) {
                return true
            }
        }
        return false
    }

    py.all = function (iterable) {
        for (const item of toArray(iterable)) {
            if (!py.bool(item)) {
                return false
            }
        }
        return true
    }

    py.flatten = function (list) {
        return list.reduce(function (acc, current) {
            return acc.concat(Array.isArray(current) ? py.flatten(current) : [current])
        }, [])
    }

    // index(sequence, item) returns -1 when the item is missing; arrays compare with equals()
    py.index = function (sequence, item) {
        if (Array.isArray(sequence)) {
            return sequence.findIndex(function (element) { return py.equals(element, item) })
        }
        return sequence.indexOf(item)
    }

    py.first = function (array) {
        return array[0]
    }

    py.last = function (array) {
        return array[array.length - 1]
    }

    // ---------------------------------------------------------------------
    // set-like helpers (return new arrays)
    // ---------------------------------------------------------------------

    py.remove = function (array, item) {
        return array.filter(function (element) { return element !== item })
    }

    py.without = function (list, ...values) {
        return list.filter(function (item) { return !values.includes(item) })
    }

    py.difference = function (a, b) {
        return a.filter(function (element) { return !b.includes(element) })
    }

    py.union = function (...lists) {
        return [...new Set([].concat(...lists))]
    }

    py.intersection = function (...lists) {
        if (lists.length === 0) {
            return []
        }
        return [...new Set(lists.reduce(function (common, list) {
            return common.filter(function (value) { return list.includes(value) })
        }))]
    }

    py.unique = function (list) {
        return [...new Set(list)]
    }

    // ---------------------------------------------------------------------
    // list methods (modify the array in place, like Python)
    // ---------------------------------------------------------------------

    py.append = function (array, item) {
        array.push(item)
    }

    py.extend = function (array, iterable) {
        for (const item of iterable) {
            array.push(item)
        }
    }

    py.insert = function (array, index, item) {
        array.splice(index, 0, item)
    }

    py.pop = function (array, index) {
        if (array.length === 0) {
            throw new Error('pop from empty list')
        }
        if (index === undefined) {
            return array.pop()
        }
        checkInteger(index, 'pop')
        const i = index < 0 ? array.length + index : index
        if (i < 0 || i >= array.length) {
            throw new Error('pop index out of range')
        }
        return array.splice(i, 1)[0]
    }

    py.clear = function (object) {
        if (Array.isArray(object)) {
            object.splice(0, object.length)
        } else if (object instanceof Map || object instanceof Set) {
            object.clear()
        } else {
            Object.keys(object).forEach(function (k) { delete object[k] })
        }
    }

    // count(array, item) or count(string, substring) (non-overlapping, like str.count)
    py.count = function (sequence, item) {
        if (typeof sequence === 'string') {
            if (item === '') {
                return sequence.length + 1
            }
            return sequence.split(item).length - 1
        }
        if (!Array.isArray(sequence)) {
            throw new Error('First argument must be an array')
        }
        return sequence.reduce(function (count, current) { return py.equals(current, item) ? count + 1 : count }, 0)
    }

    // ---------------------------------------------------------------------
    // string methods
    // ---------------------------------------------------------------------

    function escapeChars(chars) {
        return chars.replace(/[\\\]^-]/g, '\\$&')
    }

    py.strip = function (str, chars) {
        if (chars === undefined || chars === null) {
            return str.trim()
        }
        return py.rstrip(py.lstrip(str, chars), chars)
    }

    py.lstrip = function (str, chars) {
        if (chars === undefined || chars === null) {
            return str.replace(/^\s+/, '')
        }
        return chars === '' ? str : str.replace(new RegExp('^[' + escapeChars(chars) + ']+', 'u'), '')
    }

    py.rstrip = function (str, chars) {
        if (chars === undefined || chars === null) {
            return str.replace(/\s+$/, '')
        }
        return chars === '' ? str : str.replace(new RegExp('[' + escapeChars(chars) + ']+$', 'u'), '')
    }

    // ---------------------------------------------------------------------
    // objects
    // ---------------------------------------------------------------------

    py.keys = function (object) {
        return object instanceof Map ? Array.from(object.keys()) : Object.keys(object)
    }

    py.values = function (object) {
        return object instanceof Map ? Array.from(object.values()) : Object.values(object)
    }

    py.items = function (object) {
        return object instanceof Map ? Array.from(object.entries()) : Object.entries(object)
    }

    py.is_empty = function (object) {
        if (object === null || object === undefined) {
            return true
        }
        if (typeof object === 'string' || Array.isArray(object)) {
            return object.length === 0
        }
        if (object instanceof Map || object instanceof Set) {
            return object.size === 0
        }
        return Object.keys(object).length === 0
    }

    py.copy = function (object) {
        if (Array.isArray(object)) {
            return object.slice()
        }
        if (object instanceof Map) {
            return new Map(object)
        }
        if (object instanceof Set) {
            return new Set(object)
        }
        if (object === null || typeof object !== 'object') {
            return object
        }
        if (object instanceof Date) {
            return new Date(object.getTime())
        }
        if (object instanceof RegExp) {
            return new RegExp(object.source, object.flags)
        }
        if (ArrayBuffer.isView(object) || object instanceof ArrayBuffer) {
            return object.slice(0)
        }
        return Object.assign(Object.create(Object.getPrototypeOf(object)), object)
    }

    // deep copy that keeps Dates, Maps, Sets, RegExps and circular references intact
    py.deepcopy = function (object, memo = new Map()) {
        if (object === null || typeof object !== 'object') {
            return object
        }
        if (memo.has(object)) {
            return memo.get(object)
        }
        if (object instanceof Date || object instanceof RegExp || ArrayBuffer.isView(object) || object instanceof ArrayBuffer) {
            const result = py.copy(object)
            memo.set(object, result)
            return result
        }
        if (object instanceof Map) {
            const result = new Map()
            memo.set(object, result)
            object.forEach(function (v, k) { result.set(py.deepcopy(k, memo), py.deepcopy(v, memo)) })
            return result
        }
        if (object instanceof Set) {
            const result = new Set()
            memo.set(object, result)
            object.forEach(function (v) { result.add(py.deepcopy(v, memo)) })
            return result
        }
        const result = Array.isArray(object) ? [] : Object.create(Object.getPrototypeOf(object))
        memo.set(object, result)
        Object.keys(object).forEach(function (k) { result[k] = py.deepcopy(object[k], memo) })
        return result
    }

    // deep equality, ignoring key order (like == on Python lists and dicts)
    py.equals = function (a, b) {
        if (a === b) {
            return true
        }
        if (typeof a === 'number' && typeof b === 'number') {
            return Number.isNaN(a) && Number.isNaN(b)
        }
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
            return false
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
                if (!b.has(k) || !py.equals(v, b.get(k))) {
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
        return keysA.every(function (k) {
            return Object.prototype.hasOwnProperty.call(b, k) && py.equals(a[k], b[k])
        })
    }

    py.getattr = function (obj, name, defaultValue) {
        if (arguments.length > 2 && !py.hasattr(obj, name)) {
            return defaultValue
        }
        return obj[name]
    }

    py.setattr = function (obj, name, value) {
        obj[name] = value
    }

    py.hasattr = function (obj, name) {
        return obj !== null && obj !== undefined && name in Object(obj)
    }

    py.invert = function (object) {
        return Object.entries(object).reduce(function (acc, entry) {
            acc[entry[1]] = entry[0]
            return acc
        }, {})
    }

    return py
}))
