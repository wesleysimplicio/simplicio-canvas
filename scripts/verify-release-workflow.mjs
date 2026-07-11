import { readFile } from 'node:fs/promises'
const workflow = await readFile(new URL('../.github/workflows/release-extension.yml', import.meta.url), 'utf8')
const required = [
  ['tag trigger', "tags: ['v*']"],
  ['OIDC permission', 'id-token: write'],
  ['checksum sidecar', 'sha256sum'],
  ['SBOM', '--sbom='],
  ['Cosign', 'cosign sign-blob'],
  ['Minisign', 'minisign -Sm'],
  ['fail closed', 'refusing unsigned release'],
  ['signature verification', 'verify-blob'],
  ['artifact upload', 'actions/upload-artifact@v4'],
]
const missing = required.filter(([, marker]) => !workflow.includes(marker)).map(([name]) => name)
if (missing.length) throw new Error(`release workflow missing: ${missing.join(', ')}`)
if (workflow.includes('continue-on-error: true')) throw new Error('release workflow cannot ignore signing errors')
console.log(`release workflow contract valid: ${required.length} gates; publisher signing remains required at runtime`)
