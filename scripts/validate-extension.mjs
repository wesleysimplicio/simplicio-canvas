import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const manifest = JSON.parse(await readFile(resolve('extension/extension-manifest.json'), 'utf8'))
const errors = []
if (!/^[a-z0-9-]+$/.test(manifest.name)) errors.push('name must be a lowercase extension id')
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push('version must be semver')
if (!manifest.publisher || !manifest.engines?.vscode) errors.push('publisher and VS Code engine are required')
if (!manifest.main || !manifest.activationEvents?.includes('onCommand:simplicioCanvas.open')) errors.push('host command activation is required')
if (!manifest.contributes?.commands?.some((command) => command.command === 'simplicioCanvas.open')) errors.push('open command contribution is required')
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`extension manifest valid: ${manifest.name}@${manifest.version}`)
