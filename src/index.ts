/**
 * pythonicjs: Python's built-in functions and standard library helpers for
 * JavaScript and TypeScript.
 *
 *   import {range, zip, sorted, Counter, itertools} from 'pythonicjs'
 *
 * Importing this module has no side effects. To install everything as
 * globals (print(), len(), range(), ... available everywhere), import
 * 'pythonicjs/global' instead.
 */

export * from './builtins.js'
export * from './errors.js'
export * from './format.js'
export {Range, range} from './range.js'
export * from './strings.js'
export * from './collections.js'
export * as collections from './collections.js'
export * as itertools from './itertools.js'
export * as heapq from './heapq.js'
export * as bisect from './bisect.js'
export * as functools from './functools.js'
export {install} from './install.js'
