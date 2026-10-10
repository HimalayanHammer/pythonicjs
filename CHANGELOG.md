# Changelog

## 6.0.0

A rewrite in TypeScript, with Python's standard library and tests that compare every result with CPython.

### Breaking changes
- Importing or requiring `pythonicjs` no longer installs globals. Use `import 'pythonicjs/global'` / `require('pythonicjs/global')` for the old behaviour. The `<script>` build still installs globals and `window.pythonicjs`.
- The module is no longer callable (`require('pythonicjs')()`); use `install(target?)` or `pythonicjs/global`.
- `range()` returns a lazy `Range` (iterable, with `length`, `at`, `map`, `filter`, ...) instead of an array, so `range(1e9)` is cheap. Use `list(range(n))` for an array.
- `round()` rounds half to even on the exact value, like Python: `round(2.5)` is `2`, `round(2.675, 2)` is `2.67`.
- Errors are Python exceptions (`ValueError`, `IndexError`, `KeyError`, `ZeroDivisionError`, `OverflowError`, `StopIteration`, or `TypeError`) with Python's messages.
- `sum()` raises `TypeError` for strings, `round()` raises `TypeError` for non-numbers, and `len()` counts code points.
- `strip()` and friends use Python's whitespace set instead of JavaScript's `trim()`.
- Node.js 20 or newer.
- The separate `pythonicjs-web` package is deprecated: this package now ships the same `<script>` build (`https://unpkg.com/pythonicjs`).

### New
- `collections`: `Counter`, `defaultdict`, `deque`, `OrderedDict`, `namedtuple`.
- `itertools`: every function, lazily, plus the popular recipes.
- `heapq` (including the Python 3.14 max-heap functions), `bisect` and `functools` (`reduce`, `partial`, `cache`, `lru_cache`, `cmp_to_key`).
- Strings: `split`, `rsplit`, `splitlines`, `join`, `partition`, `rpartition`, `startswith`, `endswith`, `removeprefix`, `removesuffix`, `replace`, `find`, `rfind`, `zfill`, `center`, `ljust`, `rjust`, `title`, `capitalize`, `swapcase`, `casefold`, `expandtabs` and the `is*` predicates.
- Formatting: `str_format` (`str.format`), `format` with the full format-spec mini-language, `repr` and `ascii`.
- Builtins: `slice`, `sort`, `iter`, `next`, `callable`, `delattr`, `zip(..., {strict})`, `pop` on objects and Maps, `pow(x, -1, m)`, and Unicode digits, `base = 0` and exact BigInts in `int()`.
- Compensated float summation in `sum()`, like Python 3.12.
- Dunder hooks for custom classes: `__lt__`, `__eq__`, `__len__`, `__bool__`, `__repr__`, `__format__`, `__copy__`.
- TypeScript declarations with precise generics, ES modules, CommonJS, subpath exports (`pythonicjs/itertools`, ...), typed global mode, and a JSR package.
- Differential tests against CPython 3.13, a docs site with a playground, and releases with npm provenance.

## 5.0.0

### Breaking changes
- `int()` and `float()` throw on invalid strings (like Python's `ValueError`) instead of returning `NaN`. `int('12px')` used to return `12`.
- `type(null)` returns `'null'` instead of `'object'`.
- `hex()` of a negative number returns `'-0x1'` instead of the 32-bit two's complement, and non-integers throw.
- `pop()` throws on an empty list or an out-of-range index instead of returning `undefined`.
- `len()` accepts objects, Maps and Sets instead of throwing.
- `sorted()`, `max()` and `min()` throw a `TypeError` for values Python can't order, such as a string and a number.
- `range()` and `pop()` require integer arguments.
- `index()` and `count()` compare array items by value, so `index([[1]], [1])` is `0`.

### Fixes
- `require('pythonicjs')()` works as the README always said; the module now exports the API.
- `equals()` compares nested objects deeply. Previously `equals({a: {b: 1}}, {a: {c: 2}})` was `true`.
- `sorted()` sorts arrays of strings and plain strings, orders by code point, applies `key` to every type and no longer throws on arrays of objects with a key.
- `hex()` no longer truncates numbers above 32 bits.
- `str(null)`, `is_empty(null)`, `intersection()` and `hasattr('abc', 'length')` no longer throw.
- `range()` with a zero step throws a clear error.
- `deepcopy()` keeps Dates, Maps, Sets and circular references.
- `max()` and `min()` no longer overflow the stack on very large arrays.
- The library works in strict mode and in bundlers.
- `npm test` works, and mocha and chai are no longer installed as runtime dependencies.

### New
- `enumerate`, `zip`, `any`, `all`, `bool`, `list`, `items`, `divmod`, `chr`, `ord`, `bin`, `oct`, `randint`, `choice`, `shuffle`, `lstrip`, `rstrip`.
- `max(a, b, c)`, `max(iterable, {key, default})` and `sorted(iterable, {key, reverse})`.
- `int(s, 0)` and `0x`/`0o`/`0b` prefixes, exact `pow(x, y, mod)`, `sum(iterable, start)`, `getattr(obj, name, default)`, `filter(null, xs)`, `map` over several iterables, `strip(s, chars)`, `count` on strings.
- Exports for destructuring (`const {zip} = require('pythonicjs')`), `install(target)`, and `window.pythonicjs` in the browser.
