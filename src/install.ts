import * as bisect from './bisect.js'
import * as builtins from './builtins.js'
import * as collections from './collections.js'
import * as errors from './errors.js'
import * as format from './format.js'
import * as functools from './functools.js'
import * as heapq from './heapq.js'
import * as itertools from './itertools.js'
import {range} from './range.js'
import * as strings from './strings.js'

/**
 * Everything that install() puts on the target, by name. The Range class is
 * left out on purpose: it would replace the DOM's own Range in browsers.
 */
export const api: Record<string, unknown> = {
    ...builtins,
    ...strings,
    ...format,
    ...errors,
    ...collections,
    range,
    collections,
    itertools,
    heapq,
    bisect,
    functools,
}

/**
 * Installs the builtins (print, len, range, ...), the collections classes
 * (Counter, deque, defaultdict), the Python exceptions and the itertools,
 * heapq, bisect, functools and collections namespaces onto `target`
 * (globalThis by default). Returns the target.
 */
export function install<T extends object = typeof globalThis>(target: T = globalThis as T): T {
    for (const [name, value] of Object.entries(api)) {
        ;(target as Record<string, unknown>)[name] = value
    }
    return target
}
