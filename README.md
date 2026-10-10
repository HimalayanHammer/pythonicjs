# pythonicjs

[![npm](https://img.shields.io/npm/v/pythonicjs.svg)](https://www.npmjs.com/package/pythonicjs)
[![tests](https://github.com/KrishnaMBhattarai/pythonicjs/actions/workflows/test.yml/badge.svg)](https://github.com/KrishnaMBhattarai/pythonicjs/actions/workflows/test.yml)

Python's built-in functions for JavaScript. If you think in Python, write JavaScript like this:

```js
require('pythonicjs')

for (const [i, name] of enumerate(['ada', 'guido'], 1)) {
    print(i, name)
}
print(sum(range(10)))                          // 45
print(sorted(['bb', 'a', 'ccc'], {key: len}))  // [ 'a', 'bb', 'ccc' ]
print(zip([1, 2, 3], 'abc'))                   // [ [ 1, 'a' ], [ 2, 'b' ], [ 3, 'c' ] ]
```

It has no dependencies, is a single file, and works in Node.js and the browser.

## Installation

```bash
npm install pythonicjs
```

## Usage

### Node.js

Requiring the library installs every function as a global, just like Python's builtins:

```js
require('pythonicjs')
print(max(3, 7, 5))  // 7
```

If you would rather not touch globals, destructure what you need. The module is also a function that installs the globals and returns the API, so the old style still works:

```js
const {range, zip, sorted} = require('pythonicjs')
const py = require('pythonicjs')()   // py.sum, py.len, ...
require('pythonicjs').install(myObject)  // install onto your own object
```

### Browser

```html
<script src="https://unpkg.com/pythonicjs@latest"></script>
<script>
    print(sum(range(5)))     // 10
    pythonicjs.len('hello')  // 5, the API is also available as window.pythonicjs
</script>
```

Note that the global `print` replaces the browser's `window.print`. The same file is published as [pythonicjs-web](https://github.com/KrishnaMBhattarai/pythonicjs-web).

### Keyword arguments

JavaScript has no keyword arguments, so functions that take them in Python accept a trailing options object:

```js
sorted(people, {key: p => p.age, reverse: true})
max(words, {key: len})
min([], {default: 0})
```

## Reference

### Printing

| Function | Description |
| --- | --- |
| `print(...values)` | Prints values to the console. |
| `pprint(object)` | Pretty-prints an object as indented JSON. |
| `pprintr(object)` | Returns the pretty-printed JSON string instead of printing it. |
| `log(...values)` | Prints with a timestamp: `2023-11-12T16:36:11.004Z ::==> message`. |
| `timestamp()` | Current time as an ISO string. |

### Types and conversions

| Function | Description |
| --- | --- |
| `type(x)` | `typeof x`, but returns `'array'` for arrays and `'null'` for `null`. |
| `str(x)` | Converts anything to a string, including `null` and `undefined`. |
| `int(x, base = 10)` | Truncates numbers; parses strings strictly (`'12px'` throws, like Python's `ValueError`). Understands `0x`/`0o`/`0b` prefixes, `base = 0` and `_` separators. |
| `float(x)` | Parses strings strictly; understands `'inf'`, `'-inf'` and `'nan'`. |
| `bool(x)` | Python truthiness: empty arrays, objects, Maps, Sets and strings are `false`. |
| `not(x)` | `!bool(x)`. |
| `list(iterable)` | Array from a string, Set, Map or other iterable; a plain object gives its keys. |
| `chr(code)` / `ord(char)` | Unicode code point conversions. |
| `hex(n)` / `oct(n)` / `bin(n)` | `'0xff'`, `'0o10'`, `'0b101'`; negative numbers give `'-0x1'`. BigInts work too. |
| `base(n, radix)` | `n.toString(radix)`. |
| `is_array(x)`, `is_null(x)`, `is_undefined(x)` | Type checks. |

### Math

| Function | Description |
| --- | --- |
| `abs(x)` | Absolute value. |
| `pow(x, y, mod?)` | `x ** y`, or exact modular exponentiation for integers when `mod` is given. |
| `divmod(a, b)` | `[Math.floor(a / b), a mod b]` with Python's sign rules. |
| `round(x, ndigits?)` | Rounds to an integer or to `ndigits` decimal places (half rounds up, as in `Math.round`). |
| `sum(iterable, start = 0)` | Sum of the items. |
| `max(...)` / `min(...)` | `max(iterable)`, `max(a, b, c)`, or `max(iterable, {key, default})`. |
| `avg(list)` / `mean(list)` | Arithmetic mean. |
| `random(a, b)` / `randint(a, b)` | Random integer in `[a, b]`. |
| `choice(seq)` | Random item. |
| `shuffle(array)` | Shuffles in place and returns the array. |

### Sequences and iteration

| Function | Description |
| --- | --- |
| `len(x)` | Length of a string or array, size of a Map or Set, or key count of an object. |
| `range(stop)` / `range(start, stop, step = 1)` | Array of integers, like Python's `range`. A zero step or non-integer argument throws. |
| `sorted(iterable, key?, reverse?)` | New sorted array (stable). Also `sorted(iterable, {key, reverse})`. Strings sort by code point, numbers numerically, dates by time, arrays like tuples. Mixing types Python can't compare (like strings and numbers) throws a `TypeError`. A plain object returns a new object with sorted keys. |
| `reversed(seq)` | New reversed array; works on strings. |
| `enumerate(iterable, start = 0)` | `[[0, a], [1, b], ...]`. |
| `zip(...iterables)` | Groups items by position, stopping at the shortest. |
| `map(fn, ...iterables)` | Like Python's `map`, including several iterables. |
| `filter(fn, iterable)` | Items where `fn(item)` is truthy; `filter(null, xs)` keeps truthy items. |
| `any(iterable)` / `all(iterable)` | With Python truthiness. |
| `flatten(list)` | Flattens nested arrays. |
| `index(seq, item)` | Position of `item` (compared by value in arrays), or `-1`. |
| `first(array)` / `last(array)` | First or last item. |
| `unique(list)` | Items without duplicates, order kept. |
| `remove(array, item)` | New array without any `item`. |
| `without(list, ...values)` | New array without any of `values`. |
| `difference(a, b)` | Items of `a` not in `b`. |
| `union(...lists)` | Unique items from all lists. |
| `intersection(...lists)` | Unique items common to all lists. |

### List methods (modify the array in place)

| Function | Python equivalent |
| --- | --- |
| `append(array, item)` | `array.append(item)` |
| `extend(array, iterable)` | `array.extend(iterable)` |
| `insert(array, index, item)` | `array.insert(index, item)` |
| `pop(array, index?)` | `array.pop(index)`; supports negative indexes and throws on an empty list. |
| `clear(x)` | Empties an array, Map, Set or object. |
| `count(seq, item)` | Occurrences of `item` in an array (compared by value), or of a substring in a string. |

### String methods

| Function | Python equivalent |
| --- | --- |
| `strip(s, chars?)` | `s.strip(chars)` |
| `lstrip(s, chars?)` | `s.lstrip(chars)` |
| `rstrip(s, chars?)` | `s.rstrip(chars)` |

### Objects

| Function | Description |
| --- | --- |
| `keys(obj)` / `values(obj)` / `items(obj)` | Like `dict.keys()`, `.values()`, `.items()`; Maps work too. |
| `copy(x)` | Shallow copy of an array, object (keeping its class), Date, Map, Set or typed array. |
| `deepcopy(x)` | Deep copy that keeps Dates, Maps, Sets, RegExps, typed arrays, classes and circular references. |
| `equals(a, b)` | Deep equality that ignores key order, like `==` on Python lists and dicts. |
| `is_empty(x)` | `true` for `null`, `undefined`, and empty strings, arrays, objects, Maps and Sets. |
| `getattr(obj, name, default?)` | Property value, or `default` if it is missing. |
| `setattr(obj, name, value)` | Sets a property. |
| `hasattr(obj, name)` | Whether the property exists; works on primitives. |
| `invert(obj)` | Swaps keys and values. |

## Upgrading from 4.x

See [CHANGELOG.md](CHANGELOG.md). The main behaviour changes are that `int` and `float` throw on invalid strings instead of returning `NaN`, `type(null)` is `'null'`, `hex` of negative numbers returns `'-0x...'`, `pop` throws on an empty list, `range` requires integers, and `sorted`/`max`/`min` throw a `TypeError` when values can't be compared.

## Development

```bash
npm install
npm test
```

## License

MIT
