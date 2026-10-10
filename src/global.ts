/**
 * Side-effect entry point: installs every pythonicjs function as a global.
 *
 *   import 'pythonicjs/global'      // or require('pythonicjs/global')
 *   print(sum(range(10)))
 */

import {api, install} from './install.js'

install(globalThis)
;(globalThis as Record<string, unknown>).pythonicjs = api

export * from './index.js'
