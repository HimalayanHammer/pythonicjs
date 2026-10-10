// Differential tests: every case runs in pythonicjs (the <script> build, in a
// separate realm) and in CPython 3.13+, and the results must match exactly,
// including which exception is raised.
import {readdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {expect} from 'chai'
import {createContext, findPython, runJs, runPython} from './cpython/harness.mjs'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'cpython')
const files = readdirSync(dir)
    .filter((f) => f.endsWith('.cases.mjs'))
    .sort()
const suites = await Promise.all(files.map(async (f) => [f, (await import(pathToFileURL(join(dir, f)).href)).default]))

const python = findPython()

const short = (text, n = 300) => (text.length > n ? `${text.slice(0, n)}…` : text)

/** A short description of how two results differ (first few differing items of big arrays). */
function explain(expected, actual) {
    if (Array.isArray(expected) && Array.isArray(actual)) {
        const diffs = []
        for (let i = 0; i < Math.max(expected.length, actual.length) && diffs.length < 5; i++) {
            if (JSON.stringify(expected[i]) !== JSON.stringify(actual[i])) {
                diffs.push(
                    `        [${i}] expected ${short(JSON.stringify(expected[i]), 120)} got ${short(JSON.stringify(actual[i]), 120)}`,
                )
            }
        }
        return `      lengths ${expected.length} / ${actual.length}, first differences:\n${diffs.join('\n')}`
    }
    return `      expected ${short(JSON.stringify(expected))}\n      got      ${short(JSON.stringify(actual))}`
}

describe('matches CPython', function () {
    this.timeout(60000)

    if (!python) {
        if (process.env.CI) {
            it('needs Python 3.13+ in CI', () => expect.fail('set PYTHON or install Python 3.13+'))
        } else {
            it.skip('Python 3.13+ not found; set PYTHON to run these tests')
        }
        return
    }

    const allSnippets = suites.flatMap(([, cases]) => cases.map((c) => c.py))
    const pyResults = runPython(python, allSnippets)
    const context = createContext()
    let offset = 0

    for (const [file, cases] of suites) {
        const start = offset
        offset += cases.length
        describe(file.replace('.cases.mjs', ''), () => {
            it(`${cases.length} cases match`, () => {
                const failures = []
                cases.forEach((c, i) => {
                    const expected = pyResults[start + i]
                    const actual = runJs(context, c.js)
                    // compare serialized values: chai's diff of huge arrays can take hours
                    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                        failures.push(
                            `${short(c.name ?? c.js)}\n      js: ${short(c.js)}\n      py: ${short(c.py)}\n${explain(expected, actual)}`,
                        )
                    }
                })
                if (failures.length > 0) {
                    expect.fail(`\n${failures.slice(0, 25).join('\n')}\n(${failures.length} failing)`)
                }
            })
        })
    }
})
