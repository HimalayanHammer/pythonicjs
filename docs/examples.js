// Playground examples. test/docs.test.mjs runs every one of them against the
// <script> build, so the docs can't drift from the library.
export const examples = [
    {
        title: 'Builtins',
        code: `for (const [i, name] of enumerate(['ada', 'guido', 'brendan'], 1)) {
    print(i, name)
}
print(sum(range(101)))
print(sorted(['banana', 'Apple', 'cherry'], {key: (s) => s.toLowerCase()}))
print(list(zip('abc', range(3))))
print(max(['pear', 'fig', 'banana'], {key: len}))
print(divmod(-7, 2), round(2.5), round(2.675, 2))
print(slice('hello world', null, null, -1))`,
    },
    {
        title: 'Counter',
        code: `const text = 'the quick brown fox jumps over the lazy dog the end'
const words = new Counter(split(text))
print(words.most_common(3))
print(words.get('fox'), words.get('cat'))

const letters = new Counter('mississippi')
print(letters)
print(letters.total(), list(letters.elements()).join(''))`,
    },
    {
        title: 'heapq: top-k and Dijkstra',
        code: `print(heapq.nlargest(3, [5, 1, 9, 3, 7, 2]))

const graph = {
    a: [['b', 7], ['c', 9], ['f', 14]],
    b: [['c', 10], ['d', 15]],
    c: [['d', 11], ['f', 2]],
    d: [['e', 6]],
    e: [],
    f: [['e', 9]],
}

function dijkstra(start) {
    const dist = {[start]: 0}
    const heap = [[0, start]]
    while (len(heap)) {
        const [d, node] = heapq.heappop(heap)
        if (d > dist[node]) continue
        for (const [next, weight] of graph[node]) {
            const nd = d + weight
            if (!(next in dist) || nd < dist[next]) {
                dist[next] = nd
                heapq.heappush(heap, [nd, next])
            }
        }
    }
    return dist
}
print(dijkstra('a'))`,
    },
    {
        title: 'deque: sliding window',
        code: `// maximum of every window of size k, in O(n)
function windowMax(nums, k) {
    const q = new deque()
    const out = []
    for (const [i, x] of enumerate(nums)) {
        while (len(q) && nums[q.at(-1)] <= x) q.pop()
        q.append(i)
        if (q.at(0) <= i - k) q.popleft()
        if (i >= k - 1) out.push(nums[q.at(0)])
    }
    return out
}
print(windowMax([1, 3, -1, -3, 5, 3, 6, 7], 3))

const recent = new deque([], 3)
for (const page of ['home', 'docs', 'api', 'blog']) recent.append(page)
print(recent)`,
    },
    {
        title: 'itertools',
        code: `print(list(itertools.combinations('ABCD', 2)))
print(list(itertools.permutations([1, 2, 3])).length)
print(list(itertools.product('ab', range(2))))
print(list(itertools.islice(itertools.count(10, 5), 4)))
print(list(itertools.accumulate([1, 2, 3, 4])))
print(list(itertools.batched('abcdefg', 3)))

for (const [key, group] of itertools.groupby('aaabccdd')) {
    print(key, list(group).length)
}`,
    },
    {
        title: 'defaultdict and bisect',
        code: `const byLength = new defaultdict(list)
for (const word of ['apple', 'fig', 'kiwi', 'pear', 'plum', 'banana']) {
    byLength.get(len(word)).push(word)
}
print(byLength)

const grades = [60, 70, 80, 90]
const letter = (score) => 'FDCBA'[bisect.bisect(grades, score)]
print(map(letter, [33, 99, 77, 70, 89, 90, 100]))

const scores = [10, 30, 50]
bisect.insort(scores, 40)
print(scores)`,
    },
    {
        title: 'str.format and strings',
        code: `print(str_format('{:>10}|{:<10}|{:^10}', 'right', 'left', 'center'))
print(str_format('{0:,.2f} {0:.1%} {0:e}', 1234.5678))
print(str_format('{name} is {age:d} years old', {name: 'Guido', age: 70}))
print(format(255, '#x'), format(255, '08b'), format(1e6, '_'))
print(zfill('42', 5), center('py', 8, '*'), title("they're bill's friends"))
print(split('  a  b   c  '), rsplit('a,b,c', ',', 1))
print(partition('key=value=x', '='))`,
    },
    {
        title: 'functools',
        code: `const fib = functools.cache((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)))
print(fib(90))

const product = functools.reduce((a, b) => a * b, range(1, 11))
print(product)

const byLastName = functools.cmp_to_key((a, b) => compareLast(a, b))
function compareLast(a, b) {
    const [x, y] = [a.split(' ')[1], b.split(' ')[1]]
    return x < y ? -1 : x > y ? 1 : 0
}
print(sorted(['Ada Lovelace', 'Alan Turing', 'Grace Hopper'], {key: byLastName}))`,
    },
    {
        title: 'Python-exact numbers',
        code: `// Python rounds the exact binary value, half to even
print(round(0.5), round(1.5), round(2.5))
print(round(2.675, 2), '(2.675 is stored as 2.67499999...)')

// Python 3.12+ uses compensated summation
print(sum(Array(10).fill(0.1)), 'vs', [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1].reduce((a, b) => a + b))

// BigInts stay exact
print(int(2n ** 100n) * 3n, pow(2n, 100n, 1000000007n))
print(pow(3, 200, 1000000007), hex(-255), bin(10))

try {
    int('12px')
} catch (e) {
    print(e.name + ':', e.message)
}`,
    },
]
