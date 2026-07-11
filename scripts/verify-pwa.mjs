import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../dist/manifest.webmanifest', import.meta.url), 'utf8'))
const worker = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8')
const required = ['name', 'short_name', 'start_url', 'scope', 'display', 'theme_color']
for (const key of required) if (!manifest[key]) throw new Error(`PWA manifest missing ${key}`)
if (manifest.display !== 'standalone') throw new Error('PWA manifest must be standalone')
for (const marker of ['install', 'activate', 'fetch', 'caches.open']) if (!worker.includes(marker)) throw new Error(`Service worker missing ${marker} handler`)
console.log(`PWA verified: ${manifest.name}; scope ${manifest.scope}; worker ${worker.length} bytes`)
