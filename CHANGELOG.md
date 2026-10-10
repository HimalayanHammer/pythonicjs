# Changelog

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
