import {js, py, rng} from './harness.mjs'

const cases = []
const same = (code) => cases.push({js: code, py: code})
// a snippet containing `return` runs as a function body, so unwrap IIFEs
const body = (code) => (code.startsWith('(() => { ') && code.endsWith(' })()') ? code.slice(9, -5) : code)
const pair = (jsCode, pyCode) => cases.push({js: body(jsCode), py: pyCode})
const r = rng(5)

/** Runs one operation per line, recording each result or the exception name. */
function script(setupJs, setupPy, ops, finishJs, finishPy) {
    const jsLines = [setupJs, 'const out = []']
    const pyLines = [setupPy, 'out = []']
    for (const [jsOp, pyOp] of ops) {
        jsLines.push(`try { out.push(${jsOp}) } catch (e) { out.push(e.name) }`)
        pyLines.push(`try:\n    out.append(${pyOp})\nexcept Exception as e:\n    out.append(type(e).__name__)`)
    }
    pair(`${jsLines.join('\n')}\nreturn [${finishJs}, out]`, `${pyLines.join('\n')}\nresult = [${finishPy}, out]`)
}

const word = (n, alphabet = 'abcde') => Array.from({length: n}, () => r.pick([...alphabet])).join('')

// ---------------------------------------------------------------- Counter
for (let i = 0; i < 150; i++) {
    const a = word(r.int(0, 15))
    const b = word(r.int(0, 15))
    pair(`new Counter(${js(a)})`, `Counter(${py(a)})`)
    pair(`new Counter(${js(a)}).most_common()`, `Counter(${py(a)}).most_common()`)
    const n = r.pick([0, 1, 2, 3, 10, -1])
    pair(`new Counter(${js(a)}).most_common(${n})`, `Counter(${py(a)}).most_common(${n})`)
    pair(`new Counter(${js(a)}).__repr__()`, `repr(Counter(${py(a)}))`)
    pair(`[...new Counter(${js(a)}).elements()]`, `list(Counter(${py(a)}).elements())`)
    pair(`new Counter(${js(a)}).total()`, `Counter(${py(a)}).total()`)
    for (const [method, op] of [['plus', '+'], ['minus', '-'], ['and', '&'], ['or', '|']]) {
        pair(`new Counter(${js(a)}).${method}(new Counter(${js(b)}))`, `Counter(${py(a)}) ${op} Counter(${py(b)})`)
    }
    // counts that went negative through subtract
    const setupJs = `const c = new Counter(${js(a)}); c.subtract(${js(b)})`
    const setupPy = `c = Counter(${py(a)}); c.subtract(${py(b)})`
    pair(`${setupJs}\nreturn [c, c.pos(), c.neg(), c.total(), c.most_common(2), c.__repr__()]`, `${setupPy}\nresult = [c, +c, -c, c.total(), c.most_common(2), repr(c)]`)
    pair(`${setupJs}\nreturn [c.plus(new Counter(${js(a)})), c.minus(new Counter()), c.or(new Counter('ab')), c.and(new Counter('abc'))]`, `${setupPy}\nresult = [c + Counter(${py(a)}), c - Counter(), c | Counter('ab'), c & Counter('abc')]`)
    pair(`(() => { const c = new Counter(${js(a)}); c.update(${js(b)}); c.update(new Counter(${js(b)})); c.update({a: 2, z: -1}); return c })()`, `(lambda c: (c.update(${py(b)}), c.update(Counter(${py(b)})), c.update({'a': 2, 'z': -1}), c)[3])(Counter(${py(a)}))`)
}
// most_common ties keep insertion order; zero and negative counts
for (let i = 0; i < 60; i++) {
    const entries = Array.from({length: r.int(0, 10)}, (_, j) => [`k${j}`, r.int(-2, 3)])
    const obj = Object.fromEntries(entries)
    pair(`new Counter(${js(obj)}).most_common()`, `Counter(${py(obj)}).most_common()`)
    pair(`new Counter(${js(obj)}).most_common(3)`, `Counter(${py(obj)}).most_common(3)`)
    pair(`new Counter(${js(obj)}).__repr__()`, `repr(Counter(${py(obj)}))`)
    pair(`[...new Counter(${js(obj)}).elements()]`, `list(Counter(${py(obj)}).elements())`)
}
pair("new Counter('abc').get('z')", "Counter('abc')['z']")
pair("(() => { const c = new Counter('abc'); c.get('z'); return [c.has('z'), c.size] })()", "(lambda c: (c['z'], ['z' in c, len(c)])[1])(Counter('abc'))")
pair("equals(new Counter('ab'), new Counter({a: 1, b: 1, c: 0}))", "Counter('ab') == Counter({'a': 1, 'b': 1, 'c': 0})")
pair("equals(new Counter('ab'), new Counter('abb'))", "Counter('ab') == Counter('abb')")
pair("equals(new Counter('ba'), new Counter('ab'))", "Counter('ba') == Counter('ab')")
pair("new Counter().__repr__()", "repr(Counter())")
pair('new Counter([1, 2, 2, 5])', 'Counter([1, 2, 2, 5])')
pair('new Counter(5)', 'Counter(5)')
pair("new Counter({a: 1.5}).elements().next()", "next(Counter({'a': 1.5}).elements())")
pair('new Counter([3, 1, 3, 2, 1, 3]).most_common(2)', 'Counter([3, 1, 3, 2, 1, 3]).most_common(2)')

// ---------------------------------------------------------------- deque
for (let i = 0; i < 250; i++) {
    const maxlen = r.pick([null, null, 0, 1, 2, 3, 5])
    const initial = r.ints(r.int(0, 6), 0, 5)
    const ops = []
    for (let j = 0; j < r.int(1, 25); j++) {
        const v = r.int(0, 5)
        const k = r.int(-7, 7)
        const vs = r.ints(r.int(0, 4), 0, 5)
        switch (r.int(0, 17)) {
            case 0: ops.push([`d.append(${v})`, `d.append(${v})`]); break
            case 1: ops.push([`d.appendleft(${v})`, `d.appendleft(${v})`]); break
            case 2: ops.push(['d.pop()', 'd.pop()']); break
            case 3: ops.push(['d.popleft()', 'd.popleft()']); break
            case 4: ops.push([`d.extend(${js(vs)})`, `d.extend(${py(vs)})`]); break
            case 5: ops.push([`d.extendleft(${js(vs)})`, `d.extendleft(${py(vs)})`]); break
            case 6: ops.push([`d.rotate(${k})`, `d.rotate(${k})`]); break
            case 7: ops.push(['d.rotate()', 'd.rotate()']); break
            case 8: ops.push([`d.count(${v})`, `d.count(${v})`]); break
            case 9: ops.push([`d.remove(${v})`, `d.remove(${v})`]); break
            case 10: ops.push(['d.reverse()', 'd.reverse()']); break
            case 11: ops.push([`d.index(${v})`, `d.index(${v})`]); break
            case 12: {
                const stop = r.int(-7, 7)
                ops.push([`d.index(${v}, ${k}, ${stop})`, `d.index(${v}, ${k}, ${stop})`])
                break
            }
            case 13: ops.push([`d.insert(${k}, ${v})`, `d.insert(${k}, ${v})`]); break
            case 14: ops.push([`d.at(${k})`, `d[${k}]`]); break
            case 15: ops.push([`d.set(${k}, ${v})`, `d.__setitem__(${k}, ${v})`]); break
            case 16: ops.push(['[...d]', 'list(d)']); break
            default: ops.push([`d.includes(${v})`, `${v} in d`])
        }
        if (r.next() < 0.05) {
            ops.push(['d.clear()', 'd.clear()'])
        }
    }
    script(
        `const d = new deque(${js(initial)}, ${js(maxlen)})`,
        `d = deque(${py(initial)}, ${py(maxlen)})`,
        ops,
        '[...d], d.maxlen, d.length, d.__repr__()',
        'list(d), d.maxlen, len(d), repr(d)',
    )
}
// growing and wrapping the ring buffer
for (let i = 0; i < 30; i++) {
    const ops = Array.from({length: 200}, () => {
        const v = r.int(0, 100)
        return r.pick([
            [`d.append(${v})`, `d.append(${v})`],
            [`d.appendleft(${v})`, `d.appendleft(${v})`],
            ['d.pop()', 'd.pop()'],
            ['d.popleft()', 'd.popleft()'],
            [`d.rotate(${v - 50})`, `d.rotate(${v - 50})`],
        ])
    })
    script('const d = new deque()', 'd = deque()', ops, '[...d]', 'list(d)')
}
pair('new deque([1, 2], -1)', 'deque([1, 2], -1)')
pair('new deque(5)', 'deque(5)')
pair('new deque().pop()', 'deque().pop()')
pair('new deque([1, 2, 3], 2)', 'deque([1, 2, 3], 2)')
pair('new deque([1, 2], 2).insert(0, 5)', 'deque([1, 2], 2).insert(0, 5)')
pair("(() => { const d = new deque('abc'); d.extend(d); d.extendleft(d); return d })()", "(lambda d: (d.extend(d), d.extendleft(d), d)[2])(deque('abc'))")
pair("new deque(['a', [1, 2], null, true]).__repr__()", "repr(deque(['a', [1, 2], None, True]))")
pair('new deque([], 0).__repr__()', 'repr(deque([], 0))')
pair('[equals(new deque([1, 2]), new deque([1, 2], 5)), equals(new deque([1, 2]), [1, 2]), equals(new deque([1]), new deque([2]))]', '[deque([1, 2]) == deque([1, 2], 5), deque([1, 2]) == [1, 2], deque([1]) == deque([2])]')
pair('sorted([new deque([2, 1]), new deque([1, 5]), new deque([1])]).map((d) => [...d])', 'list(map(list, sorted([deque([2, 1]), deque([1, 5]), deque([1])])))')
pair('[bool(new deque()), bool(new deque([0])), len(new deque([1, 2]))]', '[bool(deque()), bool(deque([0])), len(deque([1, 2]))]')

// ---------------------------------------------------------------- defaultdict
for (let i = 0; i < 60; i++) {
    const words = Array.from({length: r.int(0, 12)}, () => word(r.int(1, 4)))
    pair(
        `(() => { const d = new defaultdict(() => []); for (const w of ${js(words)}) d.get(w[0]).push(w); return d })()`,
        `(lambda d: ([d[w[0]].append(w) for w in ${py(words)}], d)[1])(defaultdict(list))`,
    )
    pair(
        `(() => { const d = new defaultdict(() => 0); for (const w of ${js(words)}) d.set(w, d.get(w) + 1); return d })()`,
        `(lambda d: ([d.__setitem__(w, d[w] + 1) for w in ${py(words)}], d)[1])(defaultdict(int))`,
    )
}
pair("new defaultdict(null).get('a')", "defaultdict(None)['a']")
pair('new defaultdict().get(1)', 'defaultdict()[1]')
pair("new defaultdict(5)", "defaultdict(5)")
pair("(() => { const d = new defaultdict(() => 1, [['a', 2]]); const had = d.has('b'); return [had, d.size, d.get('a'), d.get('b'), d] })()", "(lambda d: ['b' in d, len(d), d['a'], d['b'], d])(defaultdict(lambda: 1, [('a', 2)]))")
pair("new defaultdict(null, {x: 1, y: [1, 'a']}).__repr__()", "repr(defaultdict(None, {'x': 1, 'y': [1, 'a']}))")

// ---------------------------------------------------------------- OrderedDict
for (let i = 0; i < 120; i++) {
    const ops = []
    for (let j = 0; j < r.int(1, 20); j++) {
        const k = r.pick(['a', 'b', 'c', 'd'])
        const v = r.int(0, 9)
        const last = r.next() < 0.5
        switch (r.int(0, 4)) {
            case 0: ops.push([`(od.set(${js(k)}, ${v}), null)`, `od.__setitem__(${py(k)}, ${v})`]); break
            case 1: ops.push([`(od.delete(${js(k)}), null)`, `(od.pop(${py(k)}, None), None)[1]`]); break
            case 2: ops.push([`od.move_to_end(${js(k)}, ${last})`, `od.move_to_end(${py(k)}, ${last ? 'True' : 'False'})`]); break
            case 3: ops.push([`od.popitem(${last})`, `od.popitem(${last ? 'True' : 'False'})`]); break
            default: ops.push(['od.__repr__()', 'repr(od)'])
        }
    }
    script("const od = new OrderedDict([['a', 1], ['b', 2], ['c', 3]])", "od = collections.OrderedDict([('a', 1), ('b', 2), ('c', 3)])", ops, 'od', 'od')
}
pair("new OrderedDict().popitem()", "collections.OrderedDict().popitem()")
pair("new OrderedDict().__repr__()", "repr(collections.OrderedDict())")
pair(
    "[equals(new OrderedDict([['a', 1], ['b', 2]]), new OrderedDict([['b', 2], ['a', 1]])), equals(new OrderedDict([['a', 1], ['b', 2]]), new Map([['b', 2], ['a', 1]])), equals(new OrderedDict({a: 1}), new OrderedDict({a: 1}))]",
    "[collections.OrderedDict([('a', 1), ('b', 2)]) == collections.OrderedDict([('b', 2), ('a', 1)]), collections.OrderedDict([('a', 1), ('b', 2)]) == {'b': 2, 'a': 1}, collections.OrderedDict({'a': 1}) == collections.OrderedDict({'a': 1})]",
)

// ---------------------------------------------------------------- namedtuple
const Point = "const Point = collections.namedtuple('Point', ['x', 'y'])"
const PyPoint = "Point = collections.namedtuple('Point', ['x', 'y'])"
const nt = (jsBody, pyBody) => pair(`${Point}\nreturn ${jsBody}`, `${PyPoint}\nresult = ${pyBody}`)
nt('new Point(1, 2)', 'Point(1, 2)')
nt('[new Point(1, 2).x, new Point(1, 2).y, new Point(1, 2)[0]]', '[Point(1, 2).x, Point(1, 2).y, Point(1, 2)[0]]')
nt("new Point(1, 'a').__repr__()", "repr(Point(1, 'a'))")
nt('new Point(1, 2)._asdict()', 'Point(1, 2)._asdict()')
nt('new Point(1, 2)._replace({y: 5})', 'Point(1, 2)._replace(y=5)')
nt('Point._make([3, 4]).__repr__()', 'repr(Point._make([3, 4]))')
nt('Point._make([3])', 'Point._make([3])')
nt('new Point(1)', 'Point(1)')
nt('new Point(1, 2, 3)', 'Point(1, 2, 3)')
nt('Point._fields', 'Point._fields')
nt('[equals(new Point(1, 2), new Point(1, 2)), equals(new Point(1, 2), new Point(2, 1))]', '[Point(1, 2) == Point(1, 2), Point(1, 2) == Point(2, 1)]')
nt('len(new Point(1, 2))', 'len(Point(1, 2))')
for (let i = 0; i < 30; i++) {
    const pts = Array.from({length: r.int(0, 8)}, () => [r.int(0, 3), r.int(0, 3)])
    nt(`sorted(${js(pts)}.map(([x, y]) => new Point(x, y))).map((p) => p.__repr__())`, `[repr(p) for p in sorted(Point(x, y) for x, y in ${py(pts)})]`)
    nt(`heapq.nsmallest(3, ${js(pts)}.map(([x, y]) => new Point(x, y)), (p) => p.y)`, `heapq.nsmallest(3, [Point(x, y) for x, y in ${py(pts)}], key=lambda p: p.y)`)
}
for (const [fields, defaults] of [
    ['x y z', [3]],
    ['x, y', []],
    ['a,b,  c', [1, 2, 3]],
    [['a', 'b'], [1, 2, 3]],
    [['a', '_b'], null],
    [['a', 'a'], null],
    [['a', 'def'], null],
    [['a', '1b'], null],
]) {
    const jsDefaults = defaults === null ? '' : `, {defaults: ${js(defaults)}}`
    const pyDefaults = defaults === null ? '' : `, defaults=${py(defaults)}`
    pair(
        `(() => { const T = collections.namedtuple('T', ${js(fields)}${jsDefaults}); return [T._fields, T._field_defaults, new T(...Array(T._fields.length - Object.keys(T._field_defaults).length).fill(0)).__repr__()] })()`,
        `(lambda T: [T._fields, T._field_defaults, repr(T(*([0] * (len(T._fields) - len(T._field_defaults)))))])(collections.namedtuple('T', ${py(fields)}${pyDefaults}))`,
    )
}
pair("collections.namedtuple('T', ['a', 'a', 'def', '_x', 'ok'], {rename: true})._fields", "collections.namedtuple('T', ['a', 'a', 'def', '_x', 'ok'], rename=True)._fields")
pair("collections.namedtuple('class', ['a'])", "collections.namedtuple('class', ['a'])")

export default cases
