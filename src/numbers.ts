/**
 * Exact decimal arithmetic on doubles, so rounding and formatting match
 * CPython, which rounds the exact binary value half-to-even.
 * Not part of the public API.
 */

import {setFloatRepr} from './internal.js'

export interface Decimal {
    /** true when the sign bit is set (including -0) */
    neg: boolean
    /** integer digits without leading zeros ('0' for values below 1) */
    int: string
    /** fraction digits without trailing zeros */
    frac: string
}

/** The exact decimal expansion of a finite double. */
export function exactDecimal(x: number): Decimal {
    if (!Number.isFinite(x)) {
        throw new RangeError('exactDecimal() needs a finite number')
    }
    const view = new DataView(new ArrayBuffer(8))
    view.setFloat64(0, x)
    const hi = view.getUint32(0)
    const lo = view.getUint32(4)
    const neg = hi >>> 31 === 1
    const biased = (hi >>> 20) & 0x7ff
    let mantissa = (BigInt(hi & 0xfffff) << BigInt(32)) | BigInt(lo)
    let exponent: number
    if (biased === 0) {
        exponent = -1074
    } else {
        mantissa |= BigInt(1) << BigInt(52)
        exponent = biased - 1075
    }
    if (mantissa === BigInt(0)) {
        return {neg, int: '0', frac: ''}
    }
    if (exponent >= 0) {
        return {neg, int: (mantissa << BigInt(exponent)).toString(), frac: ''}
    }
    const scale = -exponent
    const digits = (mantissa * BigInt(5) ** BigInt(scale)).toString().padStart(scale + 1, '0')
    const int = digits.slice(0, digits.length - scale).replace(/^0+(?=\d)/, '')
    const frac = digits.slice(digits.length - scale).replace(/0+$/, '')
    return {neg, int, frac}
}

function incrementDigits(digits: string): string {
    const chars = digits.split('')
    let i = chars.length - 1
    while (i >= 0) {
        if (chars[i] === '9') {
            chars[i] = '0'
            i--
        } else {
            chars[i] = String(Number(chars[i]) + 1)
            return chars.join('')
        }
    }
    return `1${chars.join('')}`
}

/** Whether the digits cut off past `keep` round the kept part up (half-to-even). */
function roundsUp(rest: string, lastKept: string | undefined): boolean {
    if (rest === '' || rest[0] < '5') {
        return false
    }
    if (rest[0] > '5' || /[1-9]/.test(rest.slice(1))) {
        return true
    }
    // exactly half: round to even
    return lastKept !== undefined && Number(lastKept) % 2 === 1
}

/**
 * Rounds a decimal to `ndigits` places after the point (negative values
 * round to tens, hundreds, ...), half-to-even. Returns the integer part and
 * exactly max(ndigits, 0) fraction digits.
 */
export function roundDecimal(d: Decimal, ndigits: number): {int: string; frac: string} {
    const all = d.int === '0' ? '' : d.int
    const pointPos = all.length
    const digits = all + d.frac
    // pad so that the cut point is inside the string
    const padded = digits.padEnd(pointPos + Math.max(ndigits, 0), '0')
    const cut = pointPos + ndigits
    let kept: string
    if (cut <= 0) {
        const rest = cut === 0 ? padded : ''
        kept = roundsUp(rest, '0') ? '1' : '0'
    } else {
        kept = padded.slice(0, cut)
        if (roundsUp(padded.slice(cut), kept[kept.length - 1])) {
            kept = incrementDigits(kept)
        }
    }
    if (ndigits >= 0) {
        kept = kept.padStart(ndigits + 1, '0')
        const int = kept.slice(0, kept.length - ndigits).replace(/^0+(?=\d)/, '')
        return {int, frac: kept.slice(kept.length - ndigits)}
    }
    const int = kept === '0' ? '0' : kept + '0'.repeat(-ndigits)
    return {int: int.replace(/^0+(?=\d)/, ''), frac: ''}
}

/**
 * Rounds to `precision` significant digits, half-to-even. Returns the digit
 * string (exactly `precision` digits) and the decimal exponent of the first
 * digit, so the value is d.ddd × 10^exponent.
 */
export function roundSignificant(d: Decimal, precision: number): {digits: string; exponent: number} {
    const all = (d.int === '0' ? '' : d.int) + d.frac
    const firstNonZero = all.search(/[1-9]/)
    if (firstNonZero === -1) {
        return {digits: '0'.repeat(precision), exponent: 0}
    }
    const intLength = d.int === '0' ? 0 : d.int.length
    let exponent = intLength - 1 - firstNonZero
    const significant = all.slice(firstNonZero).padEnd(precision, '0')
    let kept = significant.slice(0, precision)
    if (roundsUp(significant.slice(precision), kept[kept.length - 1])) {
        kept = incrementDigits(kept)
        if (kept.length > precision) {
            kept = kept.slice(0, precision)
            exponent += 1
        }
    }
    return {digits: kept, exponent}
}

/**
 * The shortest digits that round-trip, like Python's repr(float).
 * Returns digits without a point and the exponent of the first digit.
 */
export function shortestDigits(x: number): {digits: string; exponent: number} {
    const [mantissa, exp] = Math.abs(x).toExponential().split('e')
    return {digits: mantissa.replace('.', ''), exponent: Number(exp)}
}

/** Python's repr() of a float, e.g. 1e+16, 1e-05, 0.1, inf, nan. */
export function floatRepr(x: number): string {
    if (Number.isNaN(x)) {
        return 'nan'
    }
    if (!Number.isFinite(x)) {
        return x > 0 ? 'inf' : '-inf'
    }
    const sign = x < 0 || Object.is(x, -0) ? '-' : ''
    if (x === 0) {
        return `${sign}0.0`
    }
    const {digits, exponent} = shortestDigits(x)
    if (exponent < -4 || exponent >= 16) {
        const mantissa = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits
        const expSign = exponent < 0 ? '-' : '+'
        return `${sign}${mantissa}e${expSign}${String(Math.abs(exponent)).padStart(2, '0')}`
    }
    if (exponent < 0) {
        return `${sign}0.${'0'.repeat(-exponent - 1)}${digits}`
    }
    const int = digits.slice(0, exponent + 1).padEnd(exponent + 1, '0')
    const frac = digits.slice(exponent + 1)
    return `${sign}${int}.${frac || '0'}`
}

setFloatRepr(floatRepr)
