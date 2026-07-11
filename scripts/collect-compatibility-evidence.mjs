import { execFileSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const args = process.argv.slice(2); const project = resolve(args.find((arg) => !arg.startsWith('--')) ?? '../simplicio-loop'); const output = args.find((arg) => arg.startsWith('--output='))?.slice('--output='.length)
const fixture = await mkdtemp(`${tmpdir()}/simplicio-canvas-mapper-`); const started = Date.now()
try {
  const archive = execFileSync('git', ['-C', project, 'archive', 'HEAD'], { maxBuffer: 64 * 1024 * 1024 }); execFileSync('tar', ['-x', '-C', fixture], { input: archive })
  execFileSync('simplicio-mapper', ['scan', fixture, '--sync', '--json', '--timeout', '120'], { encoding: 'utf8', stdio: 'pipe' })
  const status = JSON.parse(execFileSync('simplicio-mapper', ['status', fixture, '--json', '--await', '--timeout', '120'], { encoding: 'utf8' }))
  const version = execFileSync('simplicio-mapper', ['--version'], { encoding: 'utf8' }).trim()
  const report = { schema: 'simplicio-canvas/compatibility-evidence/v1', generatedAt: new Date().toISOString(), mapperVersion: version, durationMs: Date.now() - started, sourcePolicy: 'metadata-only', fixture: 'simplicio-loop', phase: status.phase ?? 'complete', counts: { files: status.counts?.files ?? 0, layers: status.counts?.layers ?? 0, modules: status.counts?.modules ?? 0, symbols: status.counts?.symbols ?? 0, relationships: status.counts?.relationships ?? 0, precedents: status.counts?.precedents ?? 0 }, diagnostics: { changedFiles: status.counts?.changed_files ?? 0, artifactsPresent: Boolean(status.artifacts_present), cacheEntries: status.cache?.entries ?? 0 } }
  if (output) await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2))
} finally { await rm(fixture, { recursive: true, force: true }) }
