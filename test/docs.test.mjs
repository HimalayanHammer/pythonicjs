// Runs every playground example from docs/ against the <script> build, so
// the docs site can't drift from the library.
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {expect} from 'chai'
import {examples} from '../docs/examples.js'

describe('docs playground examples', () => {
    const bundle = readFileSync(new URL('../dist/pythonicjs.global.js', import.meta.url), 'utf8')

    for (const example of examples) {
        it(`"${example.title}" runs without errors`, () => {
            const lines = []
            const context = vm.createContext({console: {log: (...v) => lines.push(v)}})
            vm.runInContext(bundle, context)
            vm.runInContext(`(() => {${example.code}\n})()`, context)
            expect(lines.length).to.be.greaterThan(0)
        })
    }
})
