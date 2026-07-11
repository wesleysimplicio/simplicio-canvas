import { mkdir, rm } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const root = process.cwd()
await rm(`${root}/extension/dist-package`, { recursive: true, force: true })
await mkdir(`${root}/extension/artifacts`, { recursive: true })
await run('npx', ['--yes', 'tsc', '--project', 'extension/tsconfig.package.json'], { cwd: root })
const output = `${root}/extension/artifacts/simplicio-canvas-0.1.0.vsix`
await run('npx', ['--yes', '@vscode/vsce', 'package', '--out', 'artifacts/simplicio-canvas-0.1.0.vsix', '--no-yarn', '--no-gitHubIssueLinking'], { cwd: `${root}/extension` })
console.log(`VSIX created: ${output}`)
