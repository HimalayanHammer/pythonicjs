// Checks every entry point the way users load it, each in a fresh process
// or realm, so global installation in one test can't leak into another.
import {execFileSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import {expect} from 'chai'

const node = (code, type = 'module') =>
    execFileSync(process.execPath, [`--input-type=${type}`, '-e', code], {encoding: 'utf8'}).trim()

describe('packaging', () => {
    it("import 'pythonicjs' has no side effects", () => {
        expect(
            node("import {zip} from 'pythonicjs'; console.log(typeof zip, typeof globalThis.zip, typeof globalThis.print)"),
        ).to.equal('function undefined undefined')
    })

    it("require('pythonicjs') works and has no side effects", () => {
        expect(
            node("const py = require('pythonicjs'); console.log(typeof py.range, typeof globalThis.range)", 'commonjs'),
        ).to.equal('function undefined')
    })

    it("'pythonicjs/global' installs the globals (ESM and CJS)", () => {
        const check = 'console.log(typeof print, typeof zip, typeof itertools, typeof Counter, typeof pythonicjs.range)'
        const expected = 'function function object function function'
        expect(node(`import 'pythonicjs/global'; ${check}`)).to.equal(expected)
        expect(node(`require('pythonicjs/global'); ${check}`, 'commonjs')).to.equal(expected)
    })

    it('subpath exports match the namespaces', () => {
        const out = node(`
            import * as root from 'pythonicjs'
            import * as itertools from 'pythonicjs/itertools'
            import * as heapq from 'pythonicjs/heapq'
            import * as bisect from 'pythonicjs/bisect'
            import * as functools from 'pythonicjs/functools'
            import * as collections from 'pythonicjs/collections'
            console.log([
                Object.keys(itertools).join() === Object.keys(root.itertools).join(),
                Object.keys(heapq).join() === Object.keys(root.heapq).join(),
                Object.keys(bisect).join() === Object.keys(root.bisect).join(),
                Object.keys(functools).join() === Object.keys(root.functools).join(),
                collections.Counter === root.Counter,
            ].join())`)
        expect(out).to.equal('true,true,true,true,true')
    })

    it('ESM and CJS export the same names', () => {
        const esm = node(
            "import * as py from 'pythonicjs'; console.log(Object.keys(py).filter((k) => k !== 'default').sort().join())",
        )
        const cjs = node("console.log(Object.keys(require('pythonicjs')).sort().join())", 'commonjs')
        expect(esm).to.equal(cjs)
    })

    for (const file of ['pythonicjs.global.js', 'pythonicjs.global.min.js']) {
        it(`dist/${file} works as a <script> tag`, () => {
            const logs = []
            const window = {console: {log: (...args) => logs.push(args.join(' '))}}
            window.window = window
            const context = vm.createContext(window)
            vm.runInContext(readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8'), context)
            vm.runInContext('print(sum(range(5)), len("abc"), pythonicjs.sorted([3, 1]).join())', context)
            expect(logs).to.deep.equal(['10 3 1,3'])
        })
    }

    it('the <script> build runs in strict mode', () => {
        const context = vm.createContext({console})
        vm.runInContext(
            `"use strict";\n${readFileSync(new URL('../dist/pythonicjs.global.js', import.meta.url), 'utf8')}`,
            context,
        )
        expect(vm.runInContext('max(1, 2)', context)).to.equal(2)
    })
})
