// Compile-only checks that the published types infer what users expect.
// Run with `npm run test:types`; nothing here is executed.
import {enumerate, max, range, sorted, sum, zip} from 'pythonicjs'

const pairs: [number, string][] = zip([1, 2], ['a', 'b'])
const numbered: [number, string][] = enumerate(['a', 'b'])
const total: number = sum(range(10))
const longest: string = max(['a', 'abc'], {key: (s) => s.length})
const maybe: number | null = max([] as number[], {default: null})
const ordered: string[] = sorted(['b', 'a'], {key: (s) => s.length, reverse: true})
const sortedObject: Record<string, number> = sorted({b: 1, a: 2})
for (const i of range(3)) {
    const n: number = i
    void n
}

// @ts-expect-error zip keeps element types
const wrong: [string, string][] = zip([1, 2], ['a', 'b'])

void [pairs, numbered, total, longest, maybe, ordered, sortedObject, wrong]
