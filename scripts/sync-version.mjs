// Runs as the npm `version` hook: copies the new package.json version into
// jsr.json so both registries publish the same version from the same tag.
import {readFileSync, writeFileSync} from 'node:fs'

const {version} = JSON.parse(readFileSync('package.json', 'utf8'))
const jsr = JSON.parse(readFileSync('jsr.json', 'utf8'))
jsr.version = version
writeFileSync('jsr.json', `${JSON.stringify(jsr, null, 2)}\n`)
