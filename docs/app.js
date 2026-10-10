import {examples} from './examples.js'

const code = document.getElementById('code')
const output = document.getElementById('output')
const tabs = document.getElementById('example-tabs')
let current = 0

/** Formats print() arguments like Python: strings as-is, everything else as repr(). */
function show(values, className) {
    const line = document.createElement('div')
    if (className) {
        line.className = className
    }
    line.textContent = values.map((v) => (typeof v === 'string' ? v : pythonicjs.repr(v))).join(' ')
    output.append(line)
}

function run() {
    output.textContent = ''
    const original = console.log
    console.log = (...values) => show(values)
    try {
        new Function(code.value)()
    } catch (e) {
        show([`${e?.name ?? 'Error'}: ${e?.message ?? e}`], 'error')
    } finally {
        console.log = original
    }
    if (!output.textContent) {
        show(['(no output: call print() to show values)'])
    }
}

function select(i) {
    current = i
    code.value = examples[i].code
    for (const [j, tab] of [...tabs.children].entries()) {
        tab.setAttribute('aria-selected', String(j === i))
    }
    run()
}

for (const [i, example] of examples.entries()) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.role = 'tab'
    tab.textContent = example.title
    tab.addEventListener('click', () => select(i))
    tabs.append(tab)
}

document.getElementById('run').addEventListener('click', run)
document.getElementById('reset').addEventListener('click', () => select(current))

code.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        run()
    } else if (e.key === 'Tab') {
        e.preventDefault()
        code.setRangeText('    ', code.selectionStart, code.selectionEnd, 'end')
    }
})

for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(document.getElementById(button.dataset.copy).textContent)
            button.textContent = 'Copied'
        } catch {
            button.textContent = 'Copy failed'
        }
        setTimeout(() => {
            button.textContent = 'Copy'
        }, 1500)
    })
}

select(0)
