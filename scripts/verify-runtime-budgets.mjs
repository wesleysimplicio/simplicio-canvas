import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { performance } from 'node:perf_hooks'

const root = resolve(process.argv[2] ?? 'dist'); const maxBytes = Number(process.env.CANVAS_MAX_ASSET_BYTES ?? 2_000_000); const maxColdStartMs = Number(process.env.CANVAS_MAX_COLD_START_MS ?? 250)
async function files(dir) { const entries = await readdir(dir, { withFileTypes: true }); return (await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]))).flat() }
const started = performance.now(); const paths = await files(root); const sizes = await Promise.all(paths.map(async (path) => ({ path, bytes: (await stat(path)).size }))); const totalBytes = sizes.reduce((sum, item) => sum + item.bytes, 0); const coldStartMs = performance.now() - started
if (totalBytes > maxBytes) throw new Error(`runtime asset budget exceeded: ${totalBytes} > ${maxBytes} bytes`)
if (coldStartMs > maxColdStartMs) throw new Error(`cold-start metadata budget exceeded: ${coldStartMs.toFixed(1)}ms > ${maxColdStartMs}ms`)
console.log(JSON.stringify({ schema: 'simplicio-canvas/runtime-budgets/v1', root, totalBytes, coldStartMs: Number(coldStartMs.toFixed(1)), maxBytes, maxColdStartMs }))
