import { defineConfig } from 'vite'
import { execFile } from 'node:child_process'
import { mkdir, readdir, readFile, stat } from 'node:fs/promises'
import { promisify } from 'node:util'
import path from 'node:path'

const exec = promisify(execFile)
const root = process.cwd()
const workspaceRoot = path.join(root, '.simplicio', 'workspaces')
const ignored = new Set(['.git', 'node_modules', '.venv', 'venv', 'dist', 'build', 'coverage', '__pycache__'])
const repoPattern = /^(?:https:\/\/github\.com\/)?([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/

async function collectFiles(directory, prefix = '', files = []) {
  if (files.length >= 2500) return files
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name) || entry.name.startsWith('.env')) continue
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) await collectFiles(absolute, relative, files)
    else if (entry.isFile()) {
      const info = await stat(absolute)
      if (info.size > 1_000_000) continue
      let content = ''
      try { content = await readFile(absolute, 'utf8') } catch { continue }
      files.push({ path: relative, content, size: info.size })
    }
    if (files.length >= 2500) break
  }
  return files
}

function githubImportPlugin() {
  return { name: 'simplicio-github-import', configureServer(server) {
    server.middlewares.use('/api/github/import', async (request, response) => {
      response.setHeader('Content-Type', 'application/json')
      if (request.method !== 'POST') { response.statusCode = 405; response.end(JSON.stringify({ error: 'POST required' })); return }
      try {
        let raw = ''; for await (const chunk of request) { raw += chunk; if (raw.length > 4096) throw new Error('Request too large') }
        const value = String(JSON.parse(raw).repository ?? '').trim(); const match = value.replace(/\.git$/, '').match(repoPattern)
        if (!match) throw new Error('Enter a valid public GitHub repository')
        const owner = match[1], repository = match[2], slug = `${owner}/${repository}`
        const target = path.join(workspaceRoot, owner, repository); await mkdir(path.dirname(target), { recursive: true })
        try { await stat(path.join(target, '.git')); await exec('git', ['-C', target, 'pull', '--ff-only'], { timeout: 60_000 }) }
        catch { await exec('git', ['clone', '--depth', '1', `https://github.com/${slug}.git`, target], { timeout: 120_000 }) }
        let mapper = { available: true, status: 'completed', detail: '' }
        try { const result = await exec('simplicio-mapper', ['scan', target, '--sync', '--await', '--json'], { timeout: 120_000, maxBuffer: 10_000_000 }); mapper.detail = result.stdout.slice(0, 2000) }
        catch (error) { mapper = { available: false, status: 'basic-analysis', detail: error.code === 'ENOENT' ? 'simplicio-mapper is not installed or not on PATH' : String(error.stderr || error.message).slice(0, 2000) } }
        response.end(JSON.stringify({ name: slug, files: await collectFiles(target), mapper }))
      } catch (error) { response.statusCode = 400; response.end(JSON.stringify({ error: String(error.message || error) })) }
    })
  }}
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  define: { __DEMO_MODE__: JSON.stringify(process.env.VITE_CANVAS_DEMO === 'true') },
  server: { host: '127.0.0.1' },
  plugins: [githubImportPlugin()],
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-demo/**',
      '**/.simplicio/**',
      '**/.git/**',
      '**/extension/**',
      '**/.playwright-cli/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/main.ts',
        'src/example.ts',
        'src/vite-env.d.ts',
      ],
    },
  },
})
