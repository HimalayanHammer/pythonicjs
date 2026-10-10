/**
 * Python's repr(), ascii(), format() and str.format(), including the whole
 * format-spec mini-language.
 *
 * JavaScript has one number type, so integral numbers (and bigints) are
 * formatted as Python ints and other numbers as Python floats: format(3,
 * '') is '3', never '3.0', and -0 is the int 0.
 */

import {AttributeError, IndexError, KeyError, OverflowError, ValueError} from './errors.js'
import {isPlainObject, pyRepr, stringRepr, typeName} from './internal.js'
import {exactDecimal, roundDecimal, roundSignificant, shortestDigits} from './numbers.js'

// ---------------------------------------------------------------------------
// repr, ascii, str
// ---------------------------------------------------------------------------

/**
 * Python's repr(): strings get quotes and escapes, true/false/null become
 * True/False/None, arrays become lists, plain objects and Maps dicts, Sets
 * sets. Objects can define __repr__() to customise it.
 */
export function repr(object: unknown): string {
    return pyRepr(object)
}

function escapeNonAscii(s: string): string {
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII starts at U+0000
    return s.replace(/[^\x00-\x7f]/gu, (ch) => {
        const cp = ch.codePointAt(0) as number
        if (cp <= 0xff) {
            return `\\x${cp.toString(16).padStart(2, '0')}`
        }
        if (cp <= 0xffff) {
            return `\\u${cp.toString(16).padStart(4, '0')}`
        }
        return `\\U${cp.toString(16).padStart(8, '0')}`
    })
}

/** Python's ascii(): repr() with every non-ASCII character escaped as \x, \u or \U. */
export function ascii(object: unknown): string {
    return escapeNonAscii(pyRepr(object))
}

/** Python's str() of a value: strings as they are, __str__() if defined, else repr(). */
function pyStr(x: unknown): string {
    if (typeof x === 'string') {
        return x
    }
    if (x !== null && typeof x === 'object') {
        const custom = (x as {__str__?: () => unknown}).__str__
        if (typeof custom === 'function') {
            return String(custom.call(x))
        }
    }
    return pyRepr(x)
}

// ---------------------------------------------------------------------------
// format-spec parsing
// ---------------------------------------------------------------------------

interface Spec {
    fill: string
    align: string
    sign: string
    noNegZero: boolean
    alternate: boolean
    width: number
    thousands: '' | ',' | '_'
    precision: number
    type: string
}

const MAX_SSIZE = 2 ** 63 - 1

/** The decimal value of a Unicode decimal digit, or -1. */
function decimalValue(ch: string): number {
    if (!/\p{Nd}/u.test(ch)) {
        return -1
    }
    let cp = ch.codePointAt(0) as number
    let start = cp
    while (/\p{Nd}/u.test(String.fromCodePoint(start - 1))) {
        start--
    }
    cp = (cp - start) % 10
    return cp
}

function tooManyDigits(): ValueError {
    return new ValueError('Too many decimal digits in format string')
}

/** Reads an integer at cps[pos]; returns [value, characters consumed]. */
function readInteger(cps: string[], pos: number): [number, number] {
    let value = 0
    let i = pos
    while (i < cps.length) {
        const d = decimalValue(cps[i])
        if (d < 0) {
            break
        }
        if (value > (MAX_SSIZE - d) / 10) {
            throw tooManyDigits()
        }
        value = value * 10 + d
        i++
    }
    return [value, i - pos]
}

function charName(ch: string): string {
    const cp = ch.codePointAt(0) as number
    return cp > 32 && cp < 128 ? ch : `\\x${cp.toString(16)}`
}

const isAlign = (ch: string | undefined): boolean => ch === '<' || ch === '>' || ch === '=' || ch === '^'

/** CPython's parse_internal_render_format_spec. */
function parseSpec(spec: string, objectType: string, defaultType: string, defaultAlign: string): Spec {
    const cps = Array.from(spec)
    const end = cps.length
    const out: Spec = {
        fill: ' ',
        align: defaultAlign,
        sign: '',
        noNegZero: false,
        alternate: false,
        width: -1,
        thousands: '',
        precision: -1,
        type: defaultType,
    }
    let pos = 0
    let fillSpecified = false
    let alignSpecified = false
    if (end - pos >= 2 && isAlign(cps[pos + 1])) {
        out.align = cps[pos + 1]
        out.fill = cps[pos]
        fillSpecified = true
        alignSpecified = true
        pos += 2
    } else if (end - pos >= 1 && isAlign(cps[pos])) {
        out.align = cps[pos]
        alignSpecified = true
        pos++
    }
    if (pos < end && (cps[pos] === '+' || cps[pos] === '-' || cps[pos] === ' ')) {
        out.sign = cps[pos++]
    }
    if (pos < end && cps[pos] === 'z') {
        out.noNegZero = true
        pos++
    }
    if (pos < end && cps[pos] === '#') {
        out.alternate = true
        pos++
    }
    if (!fillSpecified && pos < end && cps[pos] === '0') {
        out.fill = '0'
        if (!alignSpecified && defaultAlign === '>') {
            out.align = '='
        }
        pos++
    }
    const [width, widthLength] = readInteger(cps, pos)
    pos += widthLength
    if (widthLength > 0) {
        out.width = width
    }
    if (pos < end && cps[pos] === ',') {
        out.thousands = ','
        pos++
    }
    if (pos < end && cps[pos] === '_') {
        if (out.thousands !== '') {
            throw new ValueError("Cannot specify both ',' and '_'.")
        }
        out.thousands = '_'
        pos++
    }
    if (pos < end && cps[pos] === ',' && out.thousands === '_') {
        throw new ValueError("Cannot specify both ',' and '_'.")
    }
    if (pos < end && cps[pos] === '.') {
        pos++
        const [precision, precisionLength] = readInteger(cps, pos)
        if (precisionLength === 0) {
            throw new ValueError('Format specifier missing precision')
        }
        pos += precisionLength
        out.precision = precision
    }
    if (end - pos > 1) {
        throw new ValueError(`Invalid format specifier '${spec}' for object of type '${objectType}'`)
    }
    if (end - pos === 1) {
        out.type = cps[pos]
    }
    if (out.thousands !== '' && !['d', 'e', 'f', 'g', 'E', 'G', '%', 'F', ''].includes(out.type)) {
        if (!(out.thousands === '_' && ['b', 'o', 'x', 'X'].includes(out.type))) {
            throw new ValueError(`Cannot specify '${out.thousands}' with '${charName(out.type)}'.`)
        }
    }
    return out
}

function unknownType(type: string, objectType: string): ValueError {
    return new ValueError(`Unknown format code '${charName(type)}' for object of type '${objectType}'`)
}

// ---------------------------------------------------------------------------
// numbers
// ---------------------------------------------------------------------------

/** CPython's _PyUnicode_InsertThousandsGrouping, padding with zeros up to minWidth. */
function groupDigits(digits: string, minWidth: number, size: number, sep: string): string {
    let remaining = digits.length
    let pos = digits.length
    let min = Math.max(0, minWidth)
    const groups: string[] = []
    const take = (len: number): void => {
        const zeros = Math.max(0, len - remaining)
        const n = Math.max(0, Math.min(remaining, len))
        groups.push('0'.repeat(zeros) + digits.slice(pos - n, pos))
        pos -= n
        remaining -= n
    }
    if (size > 0) {
        for (;;) {
            const len = Math.min(size, Math.max(remaining, min, 1))
            take(len)
            min -= len
            if (remaining <= 0 && min <= 0) {
                return groups.reverse().join(sep)
            }
            min -= sep.length
        }
    }
    take(Math.max(remaining, min, 1))
    return groups.reverse().join(sep)
}

/**
 * CPython's calc_number_widths and fill_number: lays out
 * [padding][sign][prefix][padding][grouped digits][.][remainder][padding].
 */
function layoutNumber(
    negative: boolean,
    prefix: string,
    digits: string,
    hasDecimal: boolean,
    remainder: string,
    spec: Spec,
    grouping: [number, string],
    upper: boolean,
): string {
    let sign = negative ? '-' : ''
    if (!negative && (spec.sign === '+' || spec.sign === ' ')) {
        sign = spec.sign
    }
    const nonDigits = sign.length + prefix.length + (hasDecimal ? 1 : 0) + Array.from(remainder).length
    const minWidth = spec.fill === '0' && spec.align === '=' ? spec.width - nonDigits : 0
    let grouped = digits === '' ? '' : groupDigits(digits, minWidth, grouping[0], grouping[1])
    const padding = spec.width - (nonDigits + grouped.length)
    let left = 0
    let middle = 0
    let right = 0
    if (padding > 0) {
        if (spec.align === '<') {
            right = padding
        } else if (spec.align === '^') {
            left = Math.floor(padding / 2)
            right = padding - left
        } else if (spec.align === '=') {
            middle = padding
        } else {
            left = padding
        }
    }
    let pre = prefix
    if (upper) {
        pre = pre.toUpperCase()
        grouped = grouped.toUpperCase()
    }
    const fill = spec.fill
    return (
        fill.repeat(left) + sign + pre + fill.repeat(middle) + grouped + (hasDecimal ? '.' : '') + remainder + fill.repeat(right)
    )
}

function groupingFor(spec: Spec): [number, string] {
    if (spec.type === 'n' || spec.thousands === '') {
        return [0, '']
    }
    return [['b', 'o', 'x', 'X'].includes(spec.type) ? 4 : 3, spec.thousands]
}

/** Gay's dtoa: digits without trailing zeros and the decimal point position. */
function dtoa(x: number, mode: 0 | 2 | 3, ndigits: number): {digits: string; decpt: number} {
    if (x === 0) {
        return {digits: '0', decpt: 1}
    }
    const strip = (s: string): string => s.replace(/0+$/, '')
    if (mode === 0) {
        const {digits, exponent} = shortestDigits(x)
        return {digits: strip(digits), decpt: exponent + 1}
    }
    const d = exactDecimal(x)
    if (mode === 2) {
        const {digits, exponent} = roundSignificant(d, ndigits)
        return {digits: strip(digits), decpt: exponent + 1}
    }
    const {int, frac} = roundDecimal(d, ndigits)
    if (int !== '0') {
        return {digits: strip(int + frac), decpt: int.length}
    }
    const zeros = frac.search(/[1-9]/)
    if (zeros === -1) {
        return {digits: '', decpt: -ndigits}
    }
    return {digits: strip(frac.slice(zeros)), decpt: -zeros}
}

/** CPython's PyOS_double_to_string for the codes e E f F g G r. */
function doubleToString(
    value: number,
    code: string,
    precision: number,
    alternate: boolean,
    addDot0: boolean,
    noNegZero: boolean,
): string {
    const upper = code === 'E' || code === 'F' || code === 'G'
    const kind = code.toLowerCase()
    let digitsWanted = precision
    if (kind === 'e') {
        digitsWanted++
    } else if (kind === 'g' && digitsWanted === 0) {
        digitsWanted = 1
    }
    if (Number.isNaN(value)) {
        return upper ? 'NAN' : 'nan'
    }
    let negative = value < 0 || Object.is(value, -0)
    if (!Number.isFinite(value)) {
        return (negative ? '-' : '') + (upper ? 'INF' : 'inf')
    }
    const mode = kind === 'r' ? 0 : kind === 'f' ? 3 : 2
    const result = dtoa(Math.abs(value), mode, digitsWanted)
    const digits = result.digits
    let decpt = result.decpt
    if (noNegZero && negative && (digits === '' || digits === '0')) {
        negative = false
    }
    const n = digits.length
    let vEnd = n
    let useExp = false
    if (kind === 'e') {
        useExp = true
        vEnd = digitsWanted
    } else if (kind === 'f') {
        vEnd = decpt + digitsWanted
    } else if (kind === 'g') {
        if (decpt <= -4 || decpt > (addDot0 ? digitsWanted - 1 : digitsWanted)) {
            useExp = true
        }
        if (alternate) {
            vEnd = digitsWanted
        }
    } else if (decpt <= -4 || decpt > 16) {
        useExp = true
    }
    let exp = 0
    if (useExp) {
        exp = decpt - 1
        decpt = 1
    }
    const vStart = decpt <= 0 ? decpt - 1 : 0
    vEnd = !useExp && addDot0 ? Math.max(vEnd, decpt + 1) : Math.max(vEnd, decpt)
    let out = negative ? '-' : ''
    if (decpt <= 0) {
        out += `${'0'.repeat(decpt - vStart)}.${'0'.repeat(-decpt)}`
    }
    if (decpt > 0 && decpt <= n) {
        out += `${digits.slice(0, decpt)}.${digits.slice(decpt)}`
    } else {
        out += digits
    }
    if (n < decpt) {
        out += `${'0'.repeat(decpt - n)}.${'0'.repeat(vEnd - decpt)}`
    } else {
        out += '0'.repeat(Math.max(0, vEnd - n))
    }
    if (out.endsWith('.') && !alternate) {
        out = out.slice(0, -1)
    }
    if (useExp) {
        out += `${upper ? 'E' : 'e'}${exp < 0 ? '-' : '+'}${String(Math.abs(exp)).padStart(2, '0')}`
    }
    return out
}

function formatFloatSpec(value: number, spec: Spec): string {
    if (spec.precision > 2147483647) {
        throw new ValueError('precision too big')
    }
    let type = spec.type
    let precision = spec.precision
    let defaultPrecision = 6
    let addDot0 = false
    let percent = false
    let x = value
    if (type === '') {
        addDot0 = true
        type = 'r'
        defaultPrecision = 0
    }
    if (type === 'n') {
        type = 'g'
    }
    if (type === '%') {
        type = 'f'
        x *= 100
        percent = true
    }
    if (precision < 0) {
        precision = defaultPrecision
    } else if (type === 'r') {
        type = 'g'
    }
    let text = doubleToString(x, type, precision, spec.alternate, addDot0, spec.noNegZero)
    if (percent) {
        text += '%'
    }
    const negative = text[0] === '-'
    if (negative) {
        text = text.slice(1)
    }
    const intDigits = (/^[0-9]*/.exec(text) as RegExpExecArray)[0]
    const hasDecimal = text[intDigits.length] === '.'
    const remainder = text.slice(intDigits.length + (hasDecimal ? 1 : 0))
    return layoutNumber(negative, '', intDigits, hasDecimal, remainder, spec, groupingFor(spec), false)
}

function formatFloat(value: number, format: string): string {
    if (format === '') {
        return pyRepr(value)
    }
    const spec = parseSpec(format, 'float', '', '>')
    if (!['', 'e', 'E', 'f', 'F', 'g', 'G', 'n', '%'].includes(spec.type)) {
        throw unknownType(spec.type, 'float')
    }
    return formatFloatSpec(value, spec)
}

function formatInt(value: bigint, format: string, objectType: string): string {
    const spec = parseSpec(format, objectType, 'd', '>')
    const type = spec.type
    if (['e', 'E', 'f', 'F', 'g', 'G', '%'].includes(type)) {
        const x = Number(value)
        if (!Number.isFinite(x)) {
            throw new OverflowError('int too large to convert to float')
        }
        return formatFloatSpec(x, spec)
    }
    if (!['b', 'c', 'd', 'o', 'x', 'X', 'n'].includes(type)) {
        throw unknownType(type, objectType)
    }
    if (spec.precision !== -1) {
        throw new ValueError('Precision not allowed in integer format specifier')
    }
    if (spec.noNegZero) {
        throw new ValueError('Negative zero coercion (z) not allowed in integer format specifier')
    }
    if (type === 'c') {
        if (spec.sign !== '') {
            throw new ValueError("Sign not allowed with integer format specifier 'c'")
        }
        if (spec.alternate) {
            throw new ValueError("Alternate form (#) not allowed with integer format specifier 'c'")
        }
        if (value < BigInt(0) || value > BigInt(0x10ffff)) {
            throw new OverflowError('%c arg not in range(0x110000)')
        }
        return layoutNumber(false, '', '', false, String.fromCodePoint(Number(value)), spec, [0, ''], false)
    }
    const base = type === 'b' ? 2 : type === 'o' ? 8 : type === 'x' || type === 'X' ? 16 : 10
    const negative = value < BigInt(0)
    const digits = (negative ? -value : value).toString(base)
    const prefix = spec.alternate && base !== 10 ? `0${type === 'b' ? 'b' : type === 'o' ? 'o' : 'x'}` : ''
    return layoutNumber(negative, prefix, digits, false, '', spec, groupingFor(spec), type === 'X')
}

// ---------------------------------------------------------------------------
// strings and other objects
// ---------------------------------------------------------------------------

function formatString(value: string, format: string): string {
    if (format === '') {
        return value
    }
    const spec = parseSpec(format, 'str', 's', '<')
    if (spec.type !== 's') {
        throw unknownType(spec.type, 'str')
    }
    if (spec.sign !== '') {
        throw new ValueError(`${spec.sign === ' ' ? 'Space' : 'Sign'} not allowed in string format specifier`)
    }
    if (spec.noNegZero) {
        throw new ValueError('Negative zero coercion (z) not allowed in string format specifier')
    }
    if (spec.alternate) {
        throw new ValueError('Alternate form (#) not allowed in string format specifier')
    }
    if (spec.align === '=') {
        throw new ValueError("'=' alignment not allowed in string format specifier")
    }
    let cps = Array.from(value)
    if (spec.precision >= 0 && cps.length > spec.precision) {
        cps = cps.slice(0, spec.precision)
    }
    const total = Math.max(spec.width, cps.length)
    const left = spec.align === '>' ? total - cps.length : spec.align === '^' ? Math.floor((total - cps.length) / 2) : 0
    const right = total - cps.length - left
    return spec.fill.repeat(left) + cps.join('') + spec.fill.repeat(right)
}

/**
 * Python's format(value, spec) with the full format-spec mini-language:
 * [[fill]align][sign][z][#][0][width][grouping][.precision][type].
 * Integral numbers and bigints format as ints, other numbers as floats,
 * booleans as bools, null/undefined as None. Objects can define
 * __format__(spec); otherwise only an empty spec is allowed.
 */
export function format(value: unknown, spec: string = ''): string {
    if (typeof spec !== 'string') {
        throw new TypeError(`format() argument 2 must be str, not ${typeName(spec)}`)
    }
    if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
        const custom = (value as {__format__?: (spec: string) => unknown}).__format__
        if (typeof custom === 'function') {
            const result = custom.call(value, spec)
            if (typeof result !== 'string') {
                throw new TypeError(`__format__ must return a str, not ${typeName(result)}`)
            }
            return result
        }
    }
    if (typeof value === 'string') {
        return formatString(value, spec)
    }
    if (typeof value === 'boolean') {
        return spec === '' ? (value ? 'True' : 'False') : formatInt(BigInt(value), spec, 'bool')
    }
    if (typeof value === 'bigint') {
        return spec === '' ? value.toString() : formatInt(value, spec, 'int')
    }
    if (typeof value === 'number') {
        if (Number.isInteger(value)) {
            return spec === '' ? BigInt(value).toString() : formatInt(BigInt(value), spec, 'int')
        }
        return formatFloat(value, spec)
    }
    if (spec !== '') {
        throw new TypeError(`unsupported format string passed to ${typeName(value)}.__format__`)
    }
    return pyStr(value)
}

// ---------------------------------------------------------------------------
// str.format
// ---------------------------------------------------------------------------

interface AutoNumber {
    state: 'init' | 'auto' | 'manual'
    next: number
}

type Kwargs = Record<string, unknown> | Map<unknown, unknown> | null

/** A field-name integer like '0' or '12', or -1 if it isn't one. */
function fieldInteger(text: string): number {
    if (text === '') {
        return -1
    }
    let value = 0
    for (const ch of text) {
        const d = decimalValue(ch)
        if (d < 0) {
            return -1
        }
        if (value > (MAX_SSIZE - d) / 10) {
            throw tooManyDigits()
        }
        value = value * 10 + d
    }
    return value
}

function notSubscriptable(obj: unknown): TypeError {
    return new TypeError(`'${typeName(obj)}' object is not subscriptable`)
}

function getItemStr(obj: unknown, key: string): unknown {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        if (typeof obj === 'string') {
            throw new TypeError("string indices must be integers, not 'str'")
        }
        throw notSubscriptable(obj)
    }
    const custom = (obj as {__getitem__?: (key: unknown) => unknown}).__getitem__
    if (typeof custom === 'function') {
        return custom.call(obj, key)
    }
    if (obj instanceof Map) {
        if (!obj.has(key)) {
            throw new KeyError(stringRepr(key))
        }
        return obj.get(key)
    }
    if (Array.isArray(obj)) {
        throw new TypeError('list indices must be integers or slices, not str')
    }
    if (obj instanceof Set) {
        throw notSubscriptable(obj)
    }
    if (!Object.hasOwn(obj, key)) {
        throw new KeyError(stringRepr(key))
    }
    return (obj as Record<string, unknown>)[key]
}

function getItemIndex(obj: unknown, index: number): unknown {
    if (typeof obj === 'string') {
        const cps = Array.from(obj)
        if (index >= cps.length) {
            throw new IndexError('string index out of range')
        }
        return cps[index]
    }
    if (obj === null || obj === undefined || typeof obj !== 'object') {
        throw notSubscriptable(obj)
    }
    const custom = (obj as {__getitem__?: (key: unknown) => unknown}).__getitem__
    if (typeof custom === 'function') {
        return custom.call(obj, index)
    }
    if (Array.isArray(obj)) {
        if (index >= obj.length) {
            throw new IndexError('list index out of range')
        }
        return obj[index]
    }
    if (obj instanceof Map) {
        if (!obj.has(index)) {
            throw new KeyError(String(index))
        }
        return obj.get(index)
    }
    if (obj instanceof Set) {
        throw notSubscriptable(obj)
    }
    if (!Object.hasOwn(obj, String(index))) {
        throw new KeyError(String(index))
    }
    return (obj as Record<string, unknown>)[String(index)]
}

function getAttr(obj: unknown, name: string): unknown {
    if (obj !== null && obj !== undefined && name in Object(obj)) {
        return (obj as Record<string, unknown>)[name]
    }
    throw new AttributeError(`'${typeName(obj)}' object has no attribute '${name}'`)
}

/** CPython's get_field_object: resolves '0', 'name', '0.attr', 'name[key][0]'. */
function getField(fieldName: string, args: unknown[] | null, kwargs: Kwargs, auto: AutoNumber): unknown {
    let i = 0
    while (i < fieldName.length && fieldName[i] !== '[' && fieldName[i] !== '.') {
        i++
    }
    const first = fieldName.slice(0, i)
    let index = fieldInteger(first)
    const empty = first === ''
    if (empty || index !== -1) {
        if (auto.state === 'init') {
            auto.state = empty ? 'auto' : 'manual'
        }
        if (auto.state === 'manual' && empty) {
            throw new ValueError('cannot switch from manual field specification to automatic field numbering')
        }
        if (auto.state === 'auto' && !empty) {
            throw new ValueError('cannot switch from automatic field numbering to manual field specification')
        }
        if (empty) {
            index = auto.next++
        }
    }
    let obj: unknown
    if (index === -1) {
        if (kwargs === null) {
            throw new KeyError(stringRepr(first))
        }
        obj = getItemStr(kwargs, first)
    } else {
        if (args === null) {
            throw new ValueError('Format string contains positional fields')
        }
        if (index >= args.length) {
            throw new IndexError(`Replacement index ${index} out of range for positional args tuple`)
        }
        obj = args[index]
    }
    const n = fieldName.length
    while (i < n) {
        const ch = fieldName[i++]
        const start = i
        let name: string
        if (ch === '.') {
            while (i < n && fieldName[i] !== '[' && fieldName[i] !== '.') {
                i++
            }
            name = fieldName.slice(start, i)
            if (name === '') {
                throw new ValueError('Empty attribute in format string')
            }
            obj = getAttr(obj, name)
        } else if (ch === '[') {
            while (i < n && fieldName[i] !== ']') {
                i++
            }
            if (i >= n) {
                throw new ValueError("Missing ']' in format string")
            }
            name = fieldName.slice(start, i)
            i++
            const key = fieldInteger(name)
            if (name === '') {
                throw new ValueError('Empty attribute in format string')
            }
            obj = key === -1 ? getItemStr(obj, name) : getItemIndex(obj, key)
        } else {
            throw new ValueError("Only '.' or '[' may follow ']' in format field specifier")
        }
    }
    return obj
}

function convert(obj: unknown, conversion: string): unknown {
    switch (conversion) {
        case 'r':
            return pyRepr(obj)
        case 's':
            return pyStr(obj)
        case 'a':
            return ascii(obj)
        default:
            throw new ValueError(`Unknown conversion specifier ${charName(conversion)}`)
    }
}

/** CPython's build_string / MarkupIterator: renders a template. */
function render(template: string, args: unknown[] | null, kwargs: Kwargs, depth: number, auto: AutoNumber): string {
    if (depth <= 0) {
        throw new ValueError('Max string recursion exceeded')
    }
    const end = template.length
    let pos = 0
    let out = ''
    while (pos < end) {
        const start = pos
        let c = ''
        let markup = false
        while (pos < end) {
            c = template[pos++]
            if (c === '{' || c === '}') {
                markup = true
                break
            }
        }
        const atEnd = pos >= end
        let length = pos - start
        if (markup && c === '}' && (atEnd || template[pos] !== '}')) {
            throw new ValueError("Single '}' encountered in format string")
        }
        if (markup && c === '{' && atEnd) {
            throw new ValueError("Single '{' encountered in format string")
        }
        if (markup) {
            if (template[pos] === c) {
                pos++
                markup = false
            } else {
                length--
            }
        }
        out += template.slice(start, start + length)
        if (!markup) {
            continue
        }

        // parse_field
        const nameStart = pos
        c = ''
        while (pos < end) {
            c = template[pos++]
            if (c === '{') {
                throw new ValueError("unexpected '{' in field name")
            }
            if (c === '[') {
                while (pos < end && template[pos] !== ']') {
                    pos++
                }
                continue
            }
            if (c === '}' || c === ':' || c === '!') {
                break
            }
        }
        const fieldName = template.slice(nameStart, pos - 1)
        let conversion = ''
        let spec = ''
        let expand = false
        if (c === '!' || c === ':') {
            let needSpec = true
            if (c === '!') {
                if (pos >= end) {
                    throw new ValueError('end of string while looking for conversion specifier')
                }
                conversion = String.fromCodePoint(template.codePointAt(pos) as number)
                pos += conversion.length
                if (pos < end) {
                    c = template[pos++]
                    if (c === '}') {
                        needSpec = false
                    } else if (c !== ':') {
                        throw new ValueError("expected ':' after conversion specifier")
                    }
                }
            }
            if (needSpec) {
                const specStart = pos
                let count = 1
                let closed = false
                while (pos < end) {
                    c = template[pos++]
                    if (c === '{') {
                        expand = true
                        count++
                    } else if (c === '}') {
                        count--
                        if (count === 0) {
                            spec = template.slice(specStart, pos - 1)
                            closed = true
                            break
                        }
                    }
                }
                if (!closed) {
                    throw new ValueError("unmatched '{' in format spec")
                }
            }
        } else if (c !== '}') {
            throw new ValueError("expected '}' before end of string")
        }

        // output_markup
        let obj = getField(fieldName, args, kwargs, auto)
        if (conversion !== '') {
            obj = convert(obj, conversion)
        }
        if (expand) {
            spec = render(spec, args, kwargs, depth - 1, auto)
        }
        out += format(obj, spec)
    }
    return out
}

/**
 * Python's str.format(): str_format('{} + {name}', 1, {name: 'x'}). A
 * trailing plain object is taken as the keyword arguments (pass an extra
 * {} to format a plain object positionally). Supports {}, {0}, {name},
 * {0.attr}, {0[1]}, {0[key]}, !r/!s/!a and nested fields in the spec.
 */
export function str_format(template: string, ...args: unknown[]): string {
    if (typeof template !== 'string') {
        throw new TypeError(`descriptor 'format' for 'str' objects doesn't apply to a '${typeName(template)}' object`)
    }
    let kwargs: Kwargs = null
    if (args.length > 0 && isPlainObject(args[args.length - 1])) {
        kwargs = args.pop() as Record<string, unknown>
    }
    return render(template, args, kwargs, 2, {state: 'init', next: 0})
}

/** Python's str.format_map(): like str_format() with only named fields, looked up in mapping. */
export function format_map(template: string, mapping: Record<string, unknown> | Map<unknown, unknown>): string {
    if (typeof template !== 'string') {
        throw new TypeError(`descriptor 'format_map' for 'str' objects doesn't apply to a '${typeName(template)}' object`)
    }
    return render(template, null, mapping, 2, {state: 'init', next: 0})
}
