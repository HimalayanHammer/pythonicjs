/**
 * Python's str methods as functions that take the string first:
 * strip(s), split(s, ','), center(s, 10, '*'), ... Indexes, widths and
 * lengths count code points, like Python, so an emoji is one character.
 * None of these mutate anything; they all return new values.
 */

import {ValueError} from './errors.js'
import {isInteger, isIterable, isPlainObject, typeName, WHITESPACE} from './internal.js'

// ---------------------------------------------------------------------------
// argument checks
// ---------------------------------------------------------------------------

function checkStr(s: unknown, method: string): asserts s is string {
    if (typeof s !== 'string') {
        throw new TypeError(`descriptor '${method}' for 'str' objects doesn't apply to a '${typeName(s)}' object`)
    }
}

function checkArg(x: unknown, message: string): asserts x is string {
    if (typeof x !== 'string') {
        throw new TypeError(`${message}, not ${typeName(x)}`)
    }
}

function checkIndex(n: unknown): number {
    if (typeof n === 'boolean') {
        return n ? 1 : 0
    }
    if (!isInteger(n)) {
        throw new TypeError(`'${typeName(n)}' object cannot be interpreted as an integer`)
    }
    return Number(n)
}

/** start/end arguments of find(), startswith(), ...: None or an integer. */
function sliceIndex(n: unknown, fallback: number): number {
    if (n === null || n === undefined) {
        return fallback
    }
    if (typeof n === 'boolean') {
        return n ? 1 : 0
    }
    if (!isInteger(n)) {
        throw new TypeError('slice indices must be integers or None or have an __index__ method')
    }
    return Number(n)
}

/** CPython's ADJUST_INDICES: clamps end, wraps negative values, leaves start > len alone. */
function adjustIndices(start: unknown, end: unknown, length: number): [number, number] {
    let lo = sliceIndex(start, 0)
    let hi = sliceIndex(end, Number.MAX_SAFE_INTEGER)
    if (hi > length) {
        hi = length
    } else if (hi < 0) {
        hi = Math.max(0, hi + length)
    }
    if (lo < 0) {
        lo = Math.max(0, lo + length)
    }
    return [lo, hi]
}

const chars = (s: string): string[] => Array.from(s)

/** The number of code points in a string. */
function cpLength(s: string): number {
    let n = 0
    for (const _ of s) {
        n++
    }
    return n
}

// ---------------------------------------------------------------------------
// stripping and splitting
// ---------------------------------------------------------------------------

const SPACE = new RegExp(`[${WHITESPACE}]`)
const isWhite = (ch: string): boolean => SPACE.test(ch)

function doStrip(s: string, stripChars: unknown, left: boolean, right: boolean, name: string): string {
    let test: (ch: string) => boolean
    if (stripChars === null || stripChars === undefined) {
        test = isWhite
    } else {
        if (typeof stripChars !== 'string') {
            throw new TypeError(`${name} arg must be None or str`)
        }
        const set = new Set(chars(stripChars))
        test = (ch) => set.has(ch)
    }
    const cps = chars(s)
    let i = 0
    let j = cps.length
    if (left) {
        while (i < j && test(cps[i])) {
            i++
        }
    }
    if (right) {
        while (j > i && test(cps[j - 1])) {
            j--
        }
    }
    return cps.slice(i, j).join('')
}

/** Python's str.strip(): removes leading and trailing Python whitespace, or the given characters. */
export function strip(s: string, chars?: string | null): string {
    checkStr(s, 'strip')
    return doStrip(s, chars, true, true, 'strip')
}

/** Python's str.lstrip(): removes leading whitespace, or the given characters. */
export function lstrip(s: string, chars?: string | null): string {
    checkStr(s, 'lstrip')
    return doStrip(s, chars, true, false, 'lstrip')
}

/** Python's str.rstrip(): removes trailing whitespace, or the given characters. */
export function rstrip(s: string, chars?: string | null): string {
    checkStr(s, 'rstrip')
    return doStrip(s, chars, false, true, 'rstrip')
}

function splitArgs(sep: unknown, maxsplit: unknown): number {
    if (sep !== null && sep !== undefined) {
        checkArg(sep, 'must be str or None')
        if (sep === '') {
            throw new ValueError('empty separator')
        }
    }
    const max = checkIndex(maxsplit)
    return max < 0 ? Number.MAX_SAFE_INTEGER : max
}

/**
 * Python's str.split(). With no separator, splits on runs of whitespace
 * and drops empty strings; otherwise splits on every occurrence of sep.
 * At most maxsplit splits are done (-1: no limit).
 */
export function split(s: string, sep?: string | null, maxsplit: number = -1): string[] {
    checkStr(s, 'split')
    let count = splitArgs(sep, maxsplit)
    const out: string[] = []
    if (sep === null || sep === undefined) {
        // whitespace characters are all in the BMP, so UTF-16 indexes are fine here
        const n = s.length
        let i = 0
        while (count-- > 0) {
            while (i < n && isWhite(s[i])) {
                i++
            }
            if (i === n) {
                break
            }
            const j = i
            i++
            while (i < n && !isWhite(s[i])) {
                i++
            }
            out.push(s.slice(j, i))
        }
        if (i < n) {
            while (i < n && isWhite(s[i])) {
                i++
            }
            if (i !== n) {
                out.push(s.slice(i))
            }
        }
        return out
    }
    let start = 0
    while (count-- > 0) {
        const at = s.indexOf(sep, start)
        if (at === -1) {
            break
        }
        out.push(s.slice(start, at))
        start = at + sep.length
    }
    out.push(s.slice(start))
    return out
}

/** Python's str.rsplit(): like split(), but maxsplit counts from the right. */
export function rsplit(s: string, sep?: string | null, maxsplit: number = -1): string[] {
    checkStr(s, 'rsplit')
    let count = splitArgs(sep, maxsplit)
    const out: string[] = []
    if (sep === null || sep === undefined) {
        let i = s.length - 1
        while (count-- > 0) {
            while (i >= 0 && isWhite(s[i])) {
                i--
            }
            if (i < 0) {
                break
            }
            const j = i
            i--
            while (i >= 0 && !isWhite(s[i])) {
                i--
            }
            out.push(s.slice(i + 1, j + 1))
        }
        if (i >= 0) {
            while (i >= 0 && isWhite(s[i])) {
                i--
            }
            if (i >= 0) {
                out.push(s.slice(0, i + 1))
            }
        }
        return out.reverse()
    }
    let end = s.length
    while (count-- > 0) {
        const at = end - sep.length < 0 ? -1 : s.lastIndexOf(sep, end - sep.length)
        if (at === -1) {
            break
        }
        out.push(s.slice(at + sep.length, end))
        end = at
    }
    out.push(s.slice(0, end))
    return out.reverse()
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: these are Python's line boundaries
const LINE_BREAK = /[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]/

/**
 * Python's str.splitlines(): splits on \n, \r, \r\n, \v, \f, \x1c-\x1e,
 * \x85, \u2028 and \u2029. keepends keeps the line breaks.
 */
export function splitlines(s: string, keepends: boolean = false): string[] {
    checkStr(s, 'splitlines')
    const out: string[] = []
    let i = 0
    const n = s.length
    while (i < n) {
        const j = i
        while (i < n && !LINE_BREAK.test(s[i])) {
            i++
        }
        let eol = i
        if (i < n) {
            if (s[i] === '\r' && s[i + 1] === '\n') {
                i += 2
            } else {
                i++
            }
            if (keepends) {
                eol = i
            }
        }
        out.push(s.slice(j, eol))
    }
    return out
}

/**
 * Python's str.join, with the separator first: join(', ', ['a', 'b']).
 * Every item must be a string. Plain objects and Maps join their keys,
 * like Python dicts.
 */
export function join(sep: string, iterable: Iterable<string>): string {
    checkStr(sep, 'join')
    let items: unknown[]
    if (isPlainObject(iterable)) {
        items = Object.keys(iterable)
    } else if (iterable instanceof Map) {
        items = Array.from(iterable.keys())
    } else if (isIterable(iterable)) {
        items = Array.from(iterable as Iterable<unknown>)
    } else {
        throw new TypeError('can only join an iterable')
    }
    items.forEach((item, i) => {
        if (typeof item !== 'string') {
            throw new TypeError(`sequence item ${i}: expected str instance, ${typeName(item)} found`)
        }
    })
    return items.join(sep)
}

function checkSep(sep: unknown): asserts sep is string {
    checkArg(sep, 'must be str')
    if (sep === '') {
        throw new ValueError('empty separator')
    }
}

/** Python's str.partition(): [before, sep, after] around the first sep, or [s, '', '']. */
export function partition(s: string, sep: string): [string, string, string] {
    checkStr(s, 'partition')
    checkSep(sep)
    const at = s.indexOf(sep)
    return at === -1 ? [s, '', ''] : [s.slice(0, at), sep, s.slice(at + sep.length)]
}

/** Python's str.rpartition(): [before, sep, after] around the last sep, or ['', '', s]. */
export function rpartition(s: string, sep: string): [string, string, string] {
    checkStr(s, 'rpartition')
    checkSep(sep)
    const at = s.lastIndexOf(sep)
    return at === -1 ? ['', '', s] : [s.slice(0, at), sep, s.slice(at + sep.length)]
}

// ---------------------------------------------------------------------------
// searching and replacing
// ---------------------------------------------------------------------------

function tailmatch(cps: string[], sub: string, start: unknown, end: unknown, atEnd: boolean): boolean {
    const subLength = cpLength(sub)
    let [lo, hi] = adjustIndices(start, end, cps.length)
    hi -= subLength
    if (hi < lo) {
        return false
    }
    if (subLength === 0) {
        return true
    }
    const at = atEnd ? hi : lo
    return cps.slice(at, at + subLength).join('') === sub
}

function affixMatch(name: string, s: string, affix: unknown, start: unknown, end: unknown, atEnd: boolean): boolean {
    checkStr(s, name)
    const cps = chars(s)
    if (Array.isArray(affix)) {
        for (const item of affix) {
            if (typeof item !== 'string') {
                throw new TypeError(`tuple for ${name} must only contain str, not ${typeName(item)}`)
            }
            if (tailmatch(cps, item, start, end, atEnd)) {
                return true
            }
        }
        return false
    }
    if (typeof affix !== 'string') {
        throw new TypeError(`${name} first arg must be str or a tuple of str, not ${typeName(affix)}`)
    }
    return tailmatch(cps, affix, start, end, atEnd)
}

/** Python's str.startswith(); prefix may be an array of candidates; start/end are code-point indexes. */
export function startswith(s: string, prefix: string | readonly string[], start?: number | null, end?: number | null): boolean {
    return affixMatch('startswith', s, prefix, start, end, false)
}

/** Python's str.endswith(); suffix may be an array of candidates; start/end are code-point indexes. */
export function endswith(s: string, suffix: string | readonly string[], start?: number | null, end?: number | null): boolean {
    return affixMatch('endswith', s, suffix, start, end, true)
}

/** Python's str.removeprefix(). */
export function removeprefix(s: string, prefix: string): string {
    checkStr(s, 'removeprefix')
    checkArg(prefix, 'removeprefix() argument must be str')
    return prefix !== '' && s.startsWith(prefix) ? s.slice(prefix.length) : s
}

/** Python's str.removesuffix(). */
export function removesuffix(s: string, suffix: string): string {
    checkStr(s, 'removesuffix')
    checkArg(suffix, 'removesuffix() argument must be str')
    return suffix !== '' && s.endsWith(suffix) ? s.slice(0, s.length - suffix.length) : s
}

/**
 * Python's str.replace(): replaces the first `count` occurrences of old
 * (all of them when count is -1). An empty old inserts the replacement
 * before every character and at the end, like Python.
 */
export function replace(s: string, old: string, replacement: string, count: number = -1): string {
    checkStr(s, 'replace')
    checkArg(old, 'replace() argument 1 must be str')
    checkArg(replacement, 'replace() argument 2 must be str')
    let max = checkIndex(count)
    if (max < 0) {
        max = Number.MAX_SAFE_INTEGER
    }
    if (old === '') {
        const cps = chars(s)
        let out = ''
        for (let i = 0; i <= cps.length; i++) {
            if (max > 0) {
                out += replacement
                max--
            }
            if (i < cps.length) {
                out += cps[i]
            }
        }
        return out
    }
    let out = ''
    let start = 0
    while (max-- > 0) {
        const at = s.indexOf(old, start)
        if (at === -1) {
            break
        }
        out += s.slice(start, at) + replacement
        start = at + old.length
    }
    return out + s.slice(start)
}

function search(name: string, s: string, sub: unknown, start: unknown, end: unknown, reverse: boolean): number {
    checkStr(s, name)
    checkArg(sub, `${name}() argument 1 must be str`)
    const cps = chars(s)
    const [lo, hi] = adjustIndices(start, end, cps.length)
    const subLength = cpLength(sub)
    if (hi - lo < subLength) {
        return -1
    }
    if (subLength === 0) {
        return reverse ? hi : lo
    }
    const hay = cps.slice(lo, hi).join('')
    const at = reverse ? hay.lastIndexOf(sub) : hay.indexOf(sub)
    return at === -1 ? -1 : lo + cpLength(hay.slice(0, at))
}

/** Python's str.find(): the code-point index of the first sub in s[start:end], or -1. */
export function find(s: string, sub: string, start?: number | null, end?: number | null): number {
    return search('find', s, sub, start, end, false)
}

/** Python's str.rfind(): the code-point index of the last sub in s[start:end], or -1. */
export function rfind(s: string, sub: string, start?: number | null, end?: number | null): number {
    return search('rfind', s, sub, start, end, true)
}

/** Python's str.rindex(): like rfind() but raises ValueError when sub is missing. */
export function rindex(s: string, sub: string, start?: number | null, end?: number | null): number {
    const at = search('rindex', s, sub, start, end, true)
    if (at === -1) {
        throw new ValueError('substring not found')
    }
    return at
}

// ---------------------------------------------------------------------------
// padding
// ---------------------------------------------------------------------------

function fillArg(fillchar: unknown): string {
    checkArg(fillchar, 'The fill character must be a unicode character')
    if (cpLength(fillchar) !== 1) {
        throw new TypeError('The fill character must be exactly one character long')
    }
    return fillchar
}

function pad(s: string, left: number, right: number, fill: string): string {
    return fill.repeat(Math.max(0, left)) + s + fill.repeat(Math.max(0, right))
}

/** Python's str.zfill(): pads with zeros on the left, after any leading sign. */
export function zfill(s: string, width: number): string {
    checkStr(s, 'zfill')
    const w = checkIndex(width)
    const length = cpLength(s)
    if (length >= w) {
        return s
    }
    const zeros = '0'.repeat(w - length)
    return s[0] === '+' || s[0] === '-' ? s[0] + zeros + s.slice(1) : zeros + s
}

/**
 * Python's str.center(). When the padding can't be split evenly the extra
 * character goes on the left if width is odd and on the right otherwise,
 * exactly like CPython (format()'s '^' always puts it on the right).
 */
export function center(s: string, width: number, fillchar: string = ' '): string {
    checkStr(s, 'center')
    const w = checkIndex(width)
    const fill = fillArg(fillchar)
    const length = cpLength(s)
    if (length >= w) {
        return s
    }
    const marg = w - length
    const left = Math.floor(marg / 2) + (marg & w & 1)
    return pad(s, left, marg - left, fill)
}

/** Python's str.ljust(): pads on the right to width code points. */
export function ljust(s: string, width: number, fillchar: string = ' '): string {
    checkStr(s, 'ljust')
    const w = checkIndex(width)
    const fill = fillArg(fillchar)
    return pad(s, 0, w - cpLength(s), fill)
}

/** Python's str.rjust(): pads on the left to width code points. */
export function rjust(s: string, width: number, fillchar: string = ' '): string {
    checkStr(s, 'rjust')
    const w = checkIndex(width)
    const fill = fillArg(fillchar)
    return pad(s, w - cpLength(s), 0, fill)
}

/** Python's str.expandtabs(): replaces tabs with spaces up to the next multiple of tabsize. */
export function expandtabs(s: string, tabsize: number = 8): string {
    checkStr(s, 'expandtabs')
    const size = checkIndex(tabsize)
    let out = ''
    let column = 0
    for (const ch of s) {
        if (ch === '\t') {
            if (size > 0) {
                const n = size - (column % size)
                column += n
                out += ' '.repeat(n)
            }
        } else {
            column++
            out += ch
            if (ch === '\n' || ch === '\r') {
                column = 0
            }
        }
    }
    return out
}

// ---------------------------------------------------------------------------
// case
// ---------------------------------------------------------------------------

const CASED = /\p{Cased}/u
const CASE_IGNORABLE = /\p{Case_Ignorable}/u
const UPPER = /\p{Uppercase}/u
const LOWER = /\p{Lowercase}/u
const TITLE = /\p{Lt}/u

// Characters whose titlecase differs from their uppercase (from CPython's Unicode database).
const TITLE_RANGES: [number, number, number][] = [
    [0x1c4, 0x1c4, 1],
    [0x1c5, 0x1c5, 0],
    [0x1c6, 0x1c6, -1],
    [0x1c7, 0x1c7, 1],
    [0x1c8, 0x1c8, 0],
    [0x1c9, 0x1c9, -1],
    [0x1ca, 0x1ca, 1],
    [0x1cb, 0x1cb, 0],
    [0x1cc, 0x1cc, -1],
    [0x1f1, 0x1f1, 1],
    [0x1f2, 0x1f2, 0],
    [0x1f3, 0x1f3, -1],
    [0x10d0, 0x10fa, 0],
    [0x10fd, 0x10ff, 0],
    [0x1f80, 0x1f87, 8],
    [0x1f88, 0x1f8f, 0],
    [0x1f90, 0x1f97, 8],
    [0x1f98, 0x1f9f, 0],
    [0x1fa0, 0x1fa7, 8],
    [0x1fa8, 0x1faf, 0],
    [0x1fb3, 0x1fb3, 9],
    [0x1fbc, 0x1fbc, 0],
    [0x1fc3, 0x1fc3, 9],
    [0x1fcc, 0x1fcc, 0],
    [0x1ff3, 0x1ff3, 9],
    [0x1ffc, 0x1ffc, 0],
]
const TITLE_SPECIAL = new Map<number, string>([
    [0xdf, 'Ss'],
    [0x587, '\u0535\u0582'],
    [0x1fb2, '\u1fba\u0345'],
    [0x1fb4, '\u0386\u0345'],
    [0x1fb7, '\u0391\u0342\u0345'],
    [0x1fc2, '\u1fca\u0345'],
    [0x1fc4, '\u0389\u0345'],
    [0x1fc7, '\u0397\u0342\u0345'],
    [0x1ff2, '\u1ffa\u0345'],
    [0x1ff4, '\u038f\u0345'],
    [0x1ff7, '\u03a9\u0342\u0345'],
    [0xfb00, 'Ff'],
    [0xfb01, 'Fi'],
    [0xfb02, 'Fl'],
    [0xfb03, 'Ffi'],
    [0xfb04, 'Ffl'],
    [0xfb05, 'St'],
    [0xfb06, 'St'],
    [0xfb13, '\u0544\u0576'],
    [0xfb14, '\u0544\u0565'],
    [0xfb15, '\u0544\u056b'],
    [0xfb16, '\u054e\u0576'],
    [0xfb17, '\u0544\u056d'],
])
// Characters whose case folding isn't covered by the rule in foldChar().
const FOLD_RANGES: [number, number, number][] = [
    [0xb5, 0xb5, 775],
    [0x17f, 0x17f, -268],
    [0x345, 0x345, 116],
    [0x3c2, 0x3c2, 1],
    [0x3d0, 0x3d0, -30],
    [0x3d1, 0x3d1, -25],
    [0x3d5, 0x3d5, -15],
    [0x3d6, 0x3d6, -22],
    [0x3f0, 0x3f0, -54],
    [0x3f1, 0x3f1, -48],
    [0x3f5, 0x3f5, -64],
    [0x13a0, 0x13f5, 0],
    [0x13f8, 0x13fd, -8],
    [0x1c80, 0x1c80, -6222],
    [0x1c81, 0x1c81, -6221],
    [0x1c82, 0x1c82, -6212],
    [0x1c83, 0x1c84, -6210],
    [0x1c85, 0x1c85, -6211],
    [0x1c86, 0x1c86, -6204],
    [0x1c87, 0x1c87, -6180],
    [0x1c88, 0x1c88, 35267],
    [0x1e9b, 0x1e9b, -58],
    [0x1fbe, 0x1fbe, -7173],
    [0xab70, 0xabbf, -38864],
]

function lookup(ranges: [number, number, number][], cp: number): string | undefined {
    for (const [lo, hi, delta] of ranges) {
        if (cp >= lo && cp <= hi) {
            return String.fromCodePoint(cp + delta)
        }
    }
    return undefined
}

function titleChar(ch: string): string {
    const cp = ch.codePointAt(0) as number
    return TITLE_SPECIAL.get(cp) ?? lookup(TITLE_RANGES, cp) ?? ch.toUpperCase()
}

function foldChar(ch: string): string {
    const cp = ch.codePointAt(0) as number
    if (cp === 0x1e9e) {
        return 'ss'
    }
    const special = lookup(FOLD_RANGES, cp)
    if (special !== undefined) {
        return special
    }
    // characters that uppercase to several (ß -> SS, ﬁ -> FI) fold to the lowercase of that
    const upper = ch.toUpperCase()
    return cpLength(upper) > 1 ? upper.toLowerCase() : ch.toLowerCase()
}

/** Lowercases cps[i], turning a capital sigma into ς at the end of a word like CPython. */
function lowerAt(cps: string[], i: number): string {
    if (cps[i] !== '\u03a3') {
        return cps[i].toLowerCase()
    }
    let j = i - 1
    while (j >= 0 && CASE_IGNORABLE.test(cps[j])) {
        j--
    }
    let final = j >= 0 && CASED.test(cps[j])
    if (final) {
        j = i + 1
        while (j < cps.length && CASE_IGNORABLE.test(cps[j])) {
            j++
        }
        final = j === cps.length || !CASED.test(cps[j])
    }
    return final ? '\u03c2' : '\u03c3'
}

/** Python's str.lower(). */
export function lower(s: string): string {
    checkStr(s, 'lower')
    return s.toLowerCase()
}

/** Python's str.upper(). */
export function upper(s: string): string {
    checkStr(s, 'upper')
    return s.toUpperCase()
}

/** Python's str.title(): titlecases the first cased character after each uncased one, lowercases the rest. */
export function title(s: string): string {
    checkStr(s, 'title')
    const cps = chars(s)
    let out = ''
    let previousCased = false
    cps.forEach((ch, i) => {
        out += previousCased ? lowerAt(cps, i) : titleChar(ch)
        previousCased = CASED.test(ch)
    })
    return out
}

/** Python's str.capitalize(): titlecases the first character and lowercases the rest. */
export function capitalize(s: string): string {
    checkStr(s, 'capitalize')
    const cps = chars(s)
    return cps.map((ch, i) => (i === 0 ? titleChar(ch) : lowerAt(cps, i))).join('')
}

/** Python's str.swapcase(). */
export function swapcase(s: string): string {
    checkStr(s, 'swapcase')
    const cps = chars(s)
    return cps.map((ch, i) => (UPPER.test(ch) ? lowerAt(cps, i) : LOWER.test(ch) ? ch.toUpperCase() : ch)).join('')
}

/** Python's str.casefold(): an aggressive lowercase for caseless matching (ß -> ss). */
export function casefold(s: string): string {
    checkStr(s, 'casefold')
    let out = ''
    for (const ch of s) {
        out += foldChar(ch)
    }
    return out
}

// ---------------------------------------------------------------------------
// predicates
// ---------------------------------------------------------------------------

// Numeric_Type=Digit characters that aren't decimal digits (superscripts, circled digits, ...).
const DIGIT_EXTRA =
    '\\u{b2}-\\u{b3}\\u{b9}\\u{1369}-\\u{1371}\\u{19da}\\u{2070}\\u{2074}-\\u{2079}\\u{2080}-\\u{2089}\\u{2460}-\\u{2468}' +
    '\\u{2474}-\\u{247c}\\u{2488}-\\u{2490}\\u{24ea}\\u{24f5}-\\u{24fd}\\u{24ff}\\u{2776}-\\u{277e}\\u{2780}-\\u{2788}' +
    '\\u{278a}-\\u{2792}\\u{10a40}-\\u{10a43}\\u{10e60}-\\u{10e68}\\u{11052}-\\u{1105a}\\u{1f100}-\\u{1f10a}'
// CJK ideographs with a numeric value (一, 二, 百, 万, ...), which aren't in \p{N}.
const NUMERIC_EXTRA =
    '\\u{3405}\\u{3483}\\u{382a}\\u{3b4d}\\u{4e00}\\u{4e03}\\u{4e07}\\u{4e09}\\u{4e24}\\u{4e5d}\\u{4e8c}\\u{4e94}\\u{4e96}' +
    '\\u{4eac}\\u{4ebf}-\\u{4ec0}\\u{4edf}\\u{4ee8}\\u{4f0d}\\u{4f70}\\u{4fe9}\\u{5006}\\u{5104}\\u{5146}\\u{5169}\\u{516b}' +
    '\\u{516d}\\u{5341}\\u{5343}-\\u{5345}\\u{534c}\\u{53c1}-\\u{53c4}\\u{56db}\\u{58f1}\\u{58f9}\\u{5e7a}\\u{5efe}-\\u{5eff}' +
    '\\u{5f0c}-\\u{5f0e}\\u{5f10}\\u{62d0}\\u{62fe}\\u{634c}\\u{67d2}\\u{6d1e}\\u{6f06}\\u{7396}\\u{767e}\\u{7695}\\u{79ed}' +
    '\\u{8086}\\u{842c}\\u{8cae}\\u{8cb3}\\u{8d30}\\u{920e}\\u{94a9}\\u{9621}\\u{9646}\\u{964c}\\u{9678}\\u{96f6}\\u{f96b}' +
    '\\u{f973}\\u{f978}\\u{f9b2}\\u{f9d1}\\u{f9d3}\\u{f9fd}\\u{20001}\\u{20064}\\u{200e2}\\u{20121}\\u{2092a}\\u{20983}' +
    '\\u{2098c}\\u{2099c}\\u{20aea}\\u{20afd}\\u{20b19}\\u{22390}\\u{22998}\\u{23b1b}\\u{2626d}\\u{2f890}'

const DECIMAL_RE = /^\p{Nd}+$/u
const DIGIT_RE = new RegExp(`^[\\p{Nd}${DIGIT_EXTRA}]+$`, 'u')
const NUMERIC_RE = new RegExp(`^[\\p{N}${NUMERIC_EXTRA}]+$`, 'u')
const ALPHA_RE = /^\p{L}+$/u
const ALNUM_RE = new RegExp(`^[\\p{L}\\p{N}${NUMERIC_EXTRA}]+$`, 'u')
const SPACE_RE = new RegExp(`^[${WHITESPACE}]+$`)
const IDENTIFIER_RE = /^[\p{XID_Start}_]\p{XID_Continue}*$/u

/** Python's str.isdecimal(): non-empty and all decimal digits (any script). */
export function isdecimal(s: string): boolean {
    checkStr(s, 'isdecimal')
    return DECIMAL_RE.test(s)
}

/** Python's str.isdigit(): decimal digits plus superscripts, circled digits and the like. */
export function isdigit(s: string): boolean {
    checkStr(s, 'isdigit')
    return DIGIT_RE.test(s)
}

/** Python's str.isnumeric(): digits plus fractions, Roman numerals, CJK numerals and the like. */
export function isnumeric(s: string): boolean {
    checkStr(s, 'isnumeric')
    return NUMERIC_RE.test(s)
}

/** Python's str.isalpha(): non-empty and all letters. */
export function isalpha(s: string): boolean {
    checkStr(s, 'isalpha')
    return ALPHA_RE.test(s)
}

/** Python's str.isalnum(): non-empty and every character is a letter or numeric. */
export function isalnum(s: string): boolean {
    checkStr(s, 'isalnum')
    return ALNUM_RE.test(s)
}

/** Python's str.isspace(): non-empty and all Python whitespace. */
export function isspace(s: string): boolean {
    checkStr(s, 'isspace')
    return SPACE_RE.test(s)
}

/** Python's str.isupper(): has a cased character and no lowercase or titlecase ones. */
export function isupper(s: string): boolean {
    checkStr(s, 'isupper')
    let cased = false
    for (const ch of s) {
        if (LOWER.test(ch) || TITLE.test(ch)) {
            return false
        }
        cased ||= UPPER.test(ch)
    }
    return cased
}

/** Python's str.islower(): has a cased character and no uppercase or titlecase ones. */
export function islower(s: string): boolean {
    checkStr(s, 'islower')
    let cased = false
    for (const ch of s) {
        if (UPPER.test(ch) || TITLE.test(ch)) {
            return false
        }
        cased ||= LOWER.test(ch)
    }
    return cased
}

/** Python's str.istitle(): uppercase only after uncased characters, lowercase only after cased ones. */
export function istitle(s: string): boolean {
    checkStr(s, 'istitle')
    let cased = false
    let previousCased = false
    for (const ch of s) {
        if (UPPER.test(ch) || TITLE.test(ch)) {
            if (previousCased) {
                return false
            }
            previousCased = true
            cased = true
        } else if (LOWER.test(ch)) {
            if (!previousCased) {
                return false
            }
            previousCased = true
            cased = true
        } else {
            previousCased = false
        }
    }
    return cased
}

/** Python's str.isidentifier(): a valid Python identifier (keywords included). */
export function isidentifier(s: string): boolean {
    checkStr(s, 'isidentifier')
    return IDENTIFIER_RE.test(s)
}

/** Python's str.isascii(): every character is below U+0080 (true for ''). */
export function isascii(s: string): boolean {
    checkStr(s, 'isascii')
    // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII starts at U+0000
    return /^[\x00-\x7f]*$/.test(s)
}
