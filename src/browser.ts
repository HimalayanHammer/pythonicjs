// Entry point for the <script> tag build: installs the globals and
// exposes the whole API as window.pythonicjs.
import {api, install} from './install.js'

install(globalThis)
;(globalThis as Record<string, unknown>).pythonicjs = api
