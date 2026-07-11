import { createHash } from 'node:crypto'
import { access, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith('--')); const artifact = resolve(positional[0] ?? 'extension/artifacts/simplicio-canvas-0.1.0.vsix')
const requireChecksum = process.argv.includes('--require-checksum'); const output = process.argv.find((arg) => arg.startsWith('--sbom='))?.slice('--sbom='.length)
const bytes = await readFile(artifact); if (!bytes.length) throw new Error(`Artifact is empty: ${artifact}`)
const sha256 = createHash('sha256').update(bytes).digest('hex'); const checksumPath = `${artifact}.sha256`; let checksumStatus = 'missing'
try { const text = await readFile(checksumPath, 'utf8'); const expected = text.trim().split(/\s+/)[0]; if (!/^[a-f0-9]{64}$/i.test(expected)) throw new Error('invalid SHA-256 sidecar'); if (expected.toLowerCase() !== sha256) throw new Error('SHA-256 mismatch'); checksumStatus = 'verified' } catch (error) { if (requireChecksum) throw error; if (error?.code !== 'ENOENT') throw error }
const report = { schema: 'simplicio-canvas/artifact-verification/v1', artifact: basename(artifact), bytes: bytes.length, sha256, checksum: checksumStatus, signature: 'detached-signature-required-by-publisher', sourcePolicy: 'artifact-metadata-only' }
if (output) await writeFile(resolve(output), JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, metadata: { component: { type: 'application', name: report.artifact, hashes: [{ alg: 'SHA-256', content: sha256 }] } }, tools: [{ vendor: 'simplicio', name: 'simplicio-canvas-verify-artifact' }] }, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
