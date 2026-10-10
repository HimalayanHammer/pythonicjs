// Builds dist/: ESM and CommonJS modules with type declarations, plus a
// browser bundle for <script> tags that installs the globals.
import {execFileSync} from 'node:child_process'
import {copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {build} from 'esbuild'

const dist = 'dist'
// source maps for the module builds are only needed to map coverage back to src/
const sourcemap = process.env.SOURCEMAPS === '1'
rmSync(dist, {recursive: true, force: true})

const entryPoints = readdirSync('src')
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join('src', f))

// one output file per source file, so the subpath exports share modules
await build({entryPoints, outdir: `${dist}/esm`, format: 'esm', target: 'es2022', keepNames: true, sourcemap})
await build({entryPoints, outdir: `${dist}/cjs`, format: 'cjs', target: 'es2022', keepNames: true, sourcemap})
writeFileSync(`${dist}/cjs/package.json`, '{"type": "commonjs"}\n')

// type declarations (tsc also type-checks the source)
execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], {stdio: 'inherit'})

// global declarations for `import 'pythonicjs/global'`
const {api} = await import(`../${dist}/esm/install.js`)
const lines = Object.keys(api)
    .sort()
    .map((name) =>
        // lib.dom declares print(): void, so merge an overload instead of redeclaring it
        name === 'print' ? '    function print(...values: unknown[]): void' : `    var ${name}: typeof py.${name}`,
    )
writeFileSync(
    `${dist}/esm/global.d.ts`,
    `import type * as py from './index.js'\n\ndeclare global {\n${lines.join('\n')}\n    var pythonicjs: Omit<typeof py, 'Range' | 'install'>\n}\n\nexport * from './index.js'\n`,
)

for (const file of readdirSync(`${dist}/esm`).filter((f) => f.endsWith('.d.ts'))) {
    copyFileSync(`${dist}/esm/${file}`, `${dist}/cjs/${file}`)
}

// browser bundle: <script src="https://unpkg.com/pythonicjs"></script>
for (const minify of [false, true]) {
    await build({
        entryPoints: ['src/browser.ts'],
        outfile: `${dist}/pythonicjs.global${minify ? '.min' : ''}.js`,
        bundle: true,
        format: 'iife',
        target: 'es2020',
        minify,
        keepNames: true,
        sourcemap: true,
    })
}
mkdirSync(dist, {recursive: true})
console.log('built dist/')
