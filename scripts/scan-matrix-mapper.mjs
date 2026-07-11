import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

const args = process.argv.slice(2); const idsArg = args.find((arg) => arg.startsWith('--ids=')); const output = args.find((arg) => arg.startsWith('--output='))?.slice('--output='.length); const matrix = JSON.parse(await readFile(resolve(new URL('.', import.meta.url).pathname, '../fixtures/compatibility-matrix.json'), 'utf8')); const selected = idsArg ? matrix.repositories.filter((entry) => idsArg.slice(6).split(',').includes(entry.id)) : matrix.repositories.filter((entry) => entry.status !== 'planned' && entry.size !== 'large').slice(0, 3)
const report = { schema: 'simplicio-canvas/compatibility-mapper-scan/v1', generatedAt: new Date().toISOString(), mode: 'temporary-shallow-clone', sourcePolicy: 'metadata-only', repositories: [] }
for (const entry of selected) {
  const fixture = await mkdtemp(`${tmpdir()}/simplicio-canvas-repo-`); const started = Date.now(); let result
  try {
    const root = resolve(fixture, entry.repository.split('/').at(-1)); execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--no-tags', `https://github.com/${entry.repository}.git`, root], { stdio: 'pipe', timeout: 120000, maxBuffer: 16 * 1024 * 1024 }); execFileSync('simplicio-mapper', ['scan', root, '--sync', '--json', '--timeout', '120'], { stdio: 'pipe', timeout: 150000, maxBuffer: 16 * 1024 * 1024 }); const status = JSON.parse(execFileSync('simplicio-mapper', ['status', root, '--json', '--await', '--timeout', '120'], { encoding: 'utf8', timeout: 150000 })); const version = execFileSync('simplicio-mapper', ['--version'], { encoding: 'utf8' }).trim(); result = { id: entry.id, repository: entry.repository, status: 'scanned', mapperVersion: version, durationMs: Date.now() - started, phase: status.phase ?? 'complete', counts: { files: status.counts?.files ?? 0, layers: status.counts?.layers ?? 0, modules: status.counts?.modules ?? 0, symbols: status.counts?.symbols ?? 0, relationships: status.counts?.relationships ?? 0 }, diagnostics: { changedFiles: status.counts?.changed_files ?? 0, artifactsPresent: Boolean(status.artifacts_present), cacheEntries: status.cache?.entries ?? 0 } }
  } catch (error) { result = { id: entry.id, repository: entry.repository, status: 'unavailable', durationMs: Date.now() - started, reason: error instanceof Error ? error.message.slice(0, 180) : 'scan failed' } }
  finally { await rm(fixture, { recursive: true, force: true }) }
  report.repositories.push(result)
}
if (output) await writeFile(resolve(output), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2))
