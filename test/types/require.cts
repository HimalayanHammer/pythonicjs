// CommonJS consumers get the same types.
import py = require('pythonicjs')

const xs: number[] = py.list(py.range(3))
void xs
