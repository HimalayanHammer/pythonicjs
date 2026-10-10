# pythonicjs

[![npm](https://img.shields.io/npm/v/pythonicjs.svg)](https://www.npmjs.com/package/pythonicjs)
[![JSR](https://jsr.io/badges/@qrishna/pythonicjs)](https://jsr.io/@qrishna/pythonicjs)
[![tests](https://github.com/KrishnaMBhattarai/pythonicjs/actions/workflows/test.yml/badge.svg)](https://github.com/KrishnaMBhattarai/pythonicjs/actions/workflows/test.yml)
[![verified against CPython](https://img.shields.io/badge/verified%20against-CPython%203.12%2B-3776ab)](#verified-against-cpython)
[![types](https://img.shields.io/badge/types-TypeScript-3178c6)](#typescript)

**Python's builtins and standard library for JavaScript and TypeScript**: lazy `range`, `zip`, `enumerate`, `sorted` with `key`, `Counter`, `deque`, `defaultdict`, `heapq`, `bisect`, `itertools`, `functools` and `str.format`. Every function is tested against real CPython.

**[Playground and cheat sheet →](https://krishnambhattarai.github.io/pythonicjs/)**

```js
import {Counter, deque, heapq, itertools, range, sorted, str_format} from 'pythonicjs'

new Counter('mississippi').most_common(2)          // [['i', 4], ['s', 4]]
sorted(['bb', 'a', 'ccc'], {key: (s) => s.length})  // ['a', 'bb', 'ccc']
str_format('{:>10,.2f}', 1234.5)                    // '  1,234.50'

const heap = []
for (const x of [5, 1, 4]) heapq.heappush(heap, x)
heapq.heappop(heap)                                 // 1

const recent = new deque([], 3)                     // keeps the last 3 items
;[...itertools.combinations('ABC', 2)]              // [['A','B'], ['A','C'], ['B','C']]
for (const i of range(1e9)) { /* lazy: no billion-item array */ }
```

## Why

JavaScript has `map`, `filter` and spread syntax, but no heap, deque, Counter, `bisect`, `defaultdict` or `itertools.permutations`. Python developers writing JavaScript, people solving LeetCode or Advent of Code in JS, and anyone teaching both languages end up rewriting them. pythonicjs gives you all of it with Python's names and, more importantly, **Python's exact behaviour**.

## Installation

```bash
npm install pythonicjs        # or: pnpm add / yarn add / bun add pythonicjs
deno add jsr:@qrishna/pythonicjs
```

```html
<script src="https://unpkg.com/pythonicjs"></script>
```

Requires Node.js 20+ or any modern browser. No dependencies.

## Usage

### ES modules (recommended)

Importing has no side effects and is fully tree-shakable.

```js
import {range, zip, Counter, itertools, heapq} from 'pythonicjs'
```

Each standard-library module also has its own entry point, mirroring Python's imports:

| Python | JavaScript |
| --- | --- |
| `from itertools import combinations` | `import {combinations} from 'pythonicjs/itertools'` |
| `from collections import Counter, deque` | `import {Counter, deque} from 'pythonicjs/collections'` |
| `from heapq import heappush, heappop` | `import {heappush, heappop} from 'pythonicjs/heapq'` |
| `from bisect import bisect_left` | `import {bisect_left} from 'pythonicjs/bisect'` |
| `from functools import lru_cache` | `import {lru_cache} from 'pythonicjs/functools'` |

### Global mode

For scripts, REPLs, notebooks and teaching, install everything as globals, like Python's builtins:

```js
import 'pythonicjs/global'      // or require('pythonicjs/global')

print(sum(range(10)))
print(new Counter('hello').most_common(1))
print(list(itertools.permutations('abc', 2)))
```

JSR (Deno) has no global entry point, because JSR doesn't allow global type declarations; call `install()` from the main module instead.

This installs the builtins, the string functions, `Counter`, `deque`, `defaultdict`, `OrderedDict`, `namedtuple`, the Python exceptions, and the `itertools`, `heapq`, `bisect`, `functools` and `collections` namespaces. TypeScript sees them as typed globals. In browsers, the global `print` replaces `window.print`.

### CommonJS

```js
const {zip, Counter} = require('pythonicjs')
```

### Browser

The `<script>` build installs the globals and exposes everything as `window.pythonicjs`:

```html
<script src="https://unpkg.com/pythonicjs"></script>
<script>
    print(sorted([3, 1, 2]))
    pythonicjs.len('hello')  // 5
</script>
```

### Keyword arguments

JavaScript has no keyword arguments, so wherever Python takes them, pass a trailing options object:

```js
sorted(people, {key: (p) => p.age, reverse: true})
max(words, {key: len, default: ''})
itertools.zip_longest(a, b, {fillvalue: 0})
itertools.product('ab', {repeat: 2})
bisect.bisect_left(rows, 30, {key: (r) => r.age})
str_format('{name} is {age}', {name: 'Ada', age: 36})
```

## Verified against CPython

The test suite includes thousands of differential tests: hand-picked edge cases plus seeded random fuzzing. Each case runs through pythonicjs and through CPython 3.12+, and the results must be identical, including which exception is raised. Some of the details this guarantees:

- `round(2.5)` is `2` and `round(2.675, 2)` is `2.67`: Python rounds the exact binary value half to even.
- `sum` of ten `0.1`s is exactly `1`, like Python 3.12's compensated summation.
- `int('١٢')` is `12`, `int('0x1f', 0)` is `31`, and `int('12px')` raises `ValueError`.
- `sorted(['a', 1])` raises `TypeError` instead of silently producing an input-dependent order.
- `heapq` builds the same heap layout as CPython, and `Counter.most_common` breaks ties the same way.
- `str_format` and `format` implement the whole format-spec mini-language: fill, alignment, signs, `z`, `#`, `0`, width, `,` and `_` grouping, precision and every type.

To run them yourself, see [Development](#development).

## Reference

Functions take the object first where Python uses a method: `s.split(',')` becomes `split(s, ',')` and `xs.append(x)` becomes `append(xs, x)`.

### Builtins

| Function | Notes |
| --- | --- |
| `print(...values)` | `console.log`. |
| `range(stop)`, `range(start, stop, step = 1)` | A lazy `Range`: iterable, with `length`, `at(i)`, `includes`, `index`, `count`, `slice`, `reverse`, and array-style `map`/`filter`/`forEach`/`reduce`/`some`/`every`/`find`/`join`. Use `list(range(n))` or `[...range(n)]` for an array. |
| `len(x)` | Strings in code points, arrays, Maps, Sets, Ranges, typed arrays, plain objects, or `__len__()`. |
| `sorted(iterable, key?, reverse?)` | Stable; also `sorted(xs, {key, reverse})`. Raises `TypeError` for values Python can't order. A plain object returns a new object with sorted keys. |
| `sort(array, key?, reverse?)` | In-place, like `list.sort()`. |
| `min(...)`, `max(...)` | `max(iterable)`, `max(a, b, c)`, `max(iterable, {key, default})`. |
| `sum(iterable, start = 0)` | Compensated float summation; BigInts; `sum(lists, [])` concatenates. |
| `enumerate(iterable, start = 0)`, `zip(...iterables, {strict}?)` | Return arrays. |
| `map(fn, ...iterables)`, `filter(fn \| null, iterable)` | Return arrays; `filter(null, xs)` keeps truthy items. |
| `reversed(seq)`, `list(iterable)` | Arrays. `list(object)` gives its keys. |
| `any(iterable)`, `all(iterable)`, `bool(x)`, `not(x)` | Python truthiness: empty arrays, objects, Maps, Sets and strings are false. |
| `iter(iterable)`, `next(iterator, default?)` | `next` raises `StopIteration` at the end unless a default is given. |
| `slice(seq, start?, stop?, step?)` | Python slicing for arrays, strings (by code point) and ranges; `null` means omitted. |
| `abs(x)`, `pow(x, y, mod?)`, `divmod(a, b)`, `round(x, ndigits?)` | Python semantics; `pow` with a modulus is exact (BigInt) and supports negative exponents. |
| `int(x, base = 10)`, `float(x)`, `str(x)` | `int` accepts prefixes, `base = 0`, `_` separators and Unicode digits; it returns a number, or a `BigInt` for `BigInt` input. `str` is JavaScript's `String`; use `repr` for Python's repr. |
| `chr(i)`, `ord(c)`, `hex(n)`, `oct(n)`, `bin(n)` | |
| `callable(x)`, `type(x)` | `type` is `typeof`, with `'array'` and `'null'`. |
| `getattr(obj, name, default?)`, `setattr`, `hasattr`, `delattr` | |
| `random(a, b)`, `randint(a, b)`, `choice(seq)`, `shuffle(array)` | From Python's `random` module. |
| `index(seq, item)`, `count(seq, item)` | Array items compare by value. `index` returns `-1` when missing. |
| `append`, `extend`, `insert`, `pop`, `clear` | List methods; `pop(obj, key, default?)` also works on objects and Maps like `dict.pop`. |
| `keys`, `values`, `items` | For objects and Maps. |
| `copy(x)`, `deepcopy(x)`, `equals(a, b)` | `equals` is Python's `==` for lists, dicts, sets and Maps. |
| `avg`/`mean`, `flatten`, `unique`, `union`, `intersection`, `difference`, `without`, `remove`, `first`, `last`, `invert`, `is_empty`, `pprint`, `log` | Extra helpers kept from earlier versions. |

### Strings

`strip`, `lstrip`, `rstrip`, `split`, `rsplit`, `splitlines`, `join(sep, iterable)`, `partition`, `rpartition`, `startswith`, `endswith`, `removeprefix`, `removesuffix`, `replace`, `find`, `rfind`, `rindex`, `lower`, `upper`, `zfill`, `center`, `ljust`, `rjust`, `title`, `capitalize`, `swapcase`, `casefold`, `expandtabs`, and the predicates `isdigit`, `isdecimal`, `isnumeric`, `isalpha`, `isalnum`, `isspace`, `isupper`, `islower`, `istitle`, `isidentifier`, `isascii`. Indexes are in code points, and the default whitespace is Python's.

### Formatting

| Function | Python |
| --- | --- |
| `str_format(template, ...args, kwargs?)` | `template.format(*args, **kwargs)`, with field access, `!r`/`!s`/`!a` and nested specs. A trailing plain object is the keyword arguments. |
| `format_map(template, mapping)` | `template.format_map(mapping)`. |
| `format(value, spec = '')` | The `format()` builtin and the full format-spec mini-language. |
| `repr(x)`, `ascii(x)` | Python's repr: `'it\'s'` → `"it's"`, `[1, 'a']` → `[1, 'a']`, `true` → `True`, `null` → `None`. |

### collections

`Counter` (a `Map` whose `get` returns `0` for missing keys; `most_common`, `elements`, `total`, `update`, `subtract`, and `plus`/`minus`/`and`/`or`/`pos`/`neg` for `+ - & | +c -c`), `defaultdict` (a `Map` whose `get` inserts the default, like `d[key]`), `deque` (O(1) at both ends, optional `maxlen`, `at(-1)` for `q[-1]`), `OrderedDict` (`move_to_end`, `popitem`) and `namedtuple` (frozen, tuple-like instances with named fields, `_asdict`, `_replace` and `_make`).

### itertools

All of them, lazily: `count`, `cycle`, `repeat`, `accumulate`, `batched`, `chain` (and `chain.from_iterable`), `compress`, `dropwhile`, `filterfalse`, `groupby`, `islice`, `pairwise`, `product`, `permutations`, `combinations`, `combinations_with_replacement`, `starmap`, `takewhile`, `tee`, `zip_longest`. Plus the popular recipes from the Python docs: `take`, `nth`, `first_true`, `unique_everseen`, `sliding_window`, `roundrobin`, `partition` and `quantify`.

### heapq, bisect and functools

- `heapq`: `heappush`, `heappop`, `heapify`, `heappushpop`, `heapreplace`, `nlargest`, `nsmallest`, `merge`, and the max-heap variants from Python 3.14 (`heappush_max`, `heappop_max`, `heapify_max`, `heapreplace_max`, `heappushpop_max`). Arrays compare like tuples, so `heappush(h, [priority, item])` works.
- `bisect`: `bisect_left`, `bisect_right`, `bisect`, `insort_left`, `insort_right`, `insort`, with `lo`, `hi` and `key`.
- `functools`: `reduce`, `partial`, `cache`, `lru_cache` (with `cache_info()` and `cache_clear()`), `cmp_to_key`.

### Exceptions

`ValueError`, `IndexError`, `KeyError`, `AttributeError`, `ZeroDivisionError`, `OverflowError` and `StopIteration` extend `Error`; Python's `TypeError` is JavaScript's `TypeError`.

```js
try {
    int('12px')
} catch (e) {
    if (e instanceof ValueError) { ... }
}
```

### Custom classes

Objects can opt into Python behaviour with dunder methods: `__lt__` (ordering in `sorted`, `min`, `max`, `heapq`, `bisect`), `__eq__` (`equals`, `count`, `index`), `__len__`, `__bool__`, `__repr__`, `__format__` and `__copy__`.

## TypeScript

The package is written in TypeScript and ships declarations for ESM, CommonJS and global mode, with precise generics: `zip([1, 2], ['a', 'b'])` is `[number, string][]`, and `max(xs, {default: null})` is `T | null`.

## Differences from Python

JavaScript can't express everything Python does, so a few things are deliberate:

- **Numbers:** JavaScript can't tell `3` from `3.0`, so integral numbers are treated as Python ints (for example, `format(3, '')` is `'3'`). Like `Number()`, `int('9007199254740993')` rounds to the nearest number; pass a `BigInt` (`int(2n ** 100n)`) to keep big integers exact.
- **Eager vs lazy:** `map`, `filter`, `zip`, `enumerate` and `reversed` return arrays, which is more useful in JavaScript. `range` and everything in `itertools` are lazy, like Python.
- **Indexing:** use `at(-1)` on a `Range` or `deque` instead of `[-1]`, and `counter.get(key)` / `defaultdict.get(key)` instead of `d[key]`.
- **Unicode:** string predicates and case mapping use the JavaScript engine's Unicode tables, which can be a version ahead of CPython's.
- **`print` is `console.log`**, and `str` is JavaScript's `String`. Use `repr` and `str_format` for Python's text output.
- `index` returns `-1` instead of raising, and `remove(array, item)` returns a new array without every occurrence (kept from earlier versions; use `pop` or `splice` to remove in place).

## Upgrading from 5.x

6.0 is a rewrite. See [CHANGELOG.md](CHANGELOG.md). In short:

- `require('pythonicjs')` and `import 'pythonicjs'` **no longer install globals**. Use `import 'pythonicjs/global'` (or `require('pythonicjs/global')`) for the old behaviour, or import the functions you need. The `<script>` build still installs globals.
- `range()` returns a lazy `Range` instead of an array. It supports `map`, `filter`, `forEach`, `length` and iteration. Wrap it in `list()` where you need a real array.
- `round()` rounds half to even like Python (`round(2.5)` is `2`).
- Errors are Python's exceptions with Python's messages, for example `ValueError: max() iterable argument is empty`.

## Development

```bash
npm install
npm test             # builds, then runs the unit, packaging and CPython differential tests
npm run test:types   # type-checks example usage
npm run coverage
npm run lint
npm run docs         # serves the docs site and playground locally
```

The differential tests need Python 3.12 or newer on your `PATH` (or set `PYTHON=/path/to/python3`). They are skipped locally when Python isn't found, and required in CI. Test cases live in `test/cpython/*.cases.mjs`: each one is a JavaScript snippet and the equivalent Python snippet.

Releases are published by GitHub Actions when a version tag is pushed (`npm version minor && git push --follow-tags`), to npm with provenance and to JSR.

## License

MIT
