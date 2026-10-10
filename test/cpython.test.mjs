// Differential tests: every case runs in pythonicjs (the <script> build, in a
// separate realm) and in CPython 3.12+, and the results must match exactly,
// including which exception is raised.
import {readdirSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {expect} from 'chai'
import {createContext, findPython, runJs, runPython} from './cpython/harness.mjs'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'cpython')
const files = readdirSync(dir).filter((f) => f.endsWith('.cases.mjs')).sort()
const suites = await Promise.all(files.map(async (f) => [f, (await import(pathToFileURL(join(dir, f)).href)).default]))

const python = findPython()

describe('matches CPython', function () {
    this.timeout(60000)

    if (!python) {
        if (process.env.CI) {
            it('needs Python 3.12+ in CI', () => expect.fail('set PYTHON or install Python 3.12+'))
        } else {
            it.skip('Python 3.12+ not found; set PYTHON to run these tests')
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
                    try {
                        expect(actual).to.deep.equal(expected)
                    } catch {
                        failures.push(`${c.name ?? c.js}\n      js: ${c.js}\n      py: ${c.py}\n      expected ${JSON.stringify(expected)}\n      got      ${JSON.stringify(actual)}`)
                    }
                })
                expect(failures, `\n${failures.slice(0, 25).join('\n')}\n(${failures.length} failing)`).to.have.length(0)
            })
        })
    }
})
