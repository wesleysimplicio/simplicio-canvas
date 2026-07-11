export interface SourceFileInput { path: string; content: string; size: number }
export interface ImportReference { specifier: string; resolvedPath?: string; external: boolean }
export interface AnalyzedFile extends SourceFileInput { language: string; imports: ImportReference[]; lines: number }
export interface ProjectConnection { source: string; target: string; specifier: string; external: boolean; type: 'import' }
export interface ProjectAnalysis { name: string; files: AnalyzedFile[]; connections: ProjectConnection[]; languages: Record<string, number>; skipped: number }

const EXTENSIONS: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript',
  py: 'Python', rs: 'Rust', go: 'Go', cs: 'C#', java: 'Java', kt: 'Kotlin', kts: 'Kotlin',
  rb: 'Ruby', php: 'PHP', swift: 'Swift', c: 'C', h: 'C/C++', cpp: 'C/C++', cc: 'C/C++', hpp: 'C/C++',
  html: 'HTML', htm: 'HTML', css: 'CSS', scss: 'SCSS', vue: 'Vue', svelte: 'Svelte',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', xml: 'XML', sql: 'SQL', sh: 'Shell', md: 'Markdown', mdx: 'Markdown',
}
const SPECIAL: Record<string, string> = { dockerfile: 'Dockerfile', makefile: 'Makefile', 'cargo.toml': 'TOML', 'pyproject.toml': 'TOML' }
const ASSET_EXTENSIONS = new Set(['png','jpg','jpeg','gif','webp','ico','pdf','zip','gz','woff','woff2','ttf','mp3','mp4','mov','wasm','lock'])
const IGNORED = /(^|\/)(node_modules|\.git|dist|build|coverage|\.venv|venv|vendor|target|__pycache__|\.next)(\/|$)/

export function detectLanguage(path: string, content = ''): string {
  const name = path.split('/').pop()?.toLowerCase() ?? ''
  if (SPECIAL[name]) return SPECIAL[name]
  const extension = name.includes('.') ? name.split('.').pop()! : ''
  if (ASSET_EXTENSIONS.has(extension)) return 'Binary/Asset'
  if (EXTENSIONS[extension]) return EXTENSIONS[extension]
  if (/^#!.*python/.test(content)) return 'Python'
  if (/^#!.*(bash|sh)/.test(content)) return 'Shell'
  return 'Plain text'
}

export function extractImports(language: string, content: string): string[] {
  const imports: string[] = []
  const add = (value?: string) => { if (value && !imports.includes(value)) imports.push(value) }
  if (['TypeScript','JavaScript','Vue','Svelte'].includes(language)) {
    for (const match of content.matchAll(/(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+(?:[\s\S]*?\s+from\s+)|import\s*\()\s*['"]([^'"]+)['"]/g)) add(match[1])
    for (const match of content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) add(match[1])
  } else if (language === 'Python') {
    for (const line of content.split('\n')) {
      let match = line.match(/^\s*from\s+([\w.]+)\s+import\s+/); if (match) { add(match[1]); continue }
      match = line.match(/^\s*import\s+([\w.]+)/); if (match) add(match[1])
    }
  } else if (language === 'Rust') for (const match of content.matchAll(/(?:use|mod)\s+([\w:]+)/g)) add(match[1])
  else if (language === 'Go') for (const match of content.matchAll(/(?:import\s+|^\s*)["`]([^"`]+)["`]/gm)) add(match[1])
  else if (['C#','Java','Kotlin'].includes(language)) for (const match of content.matchAll(/(?:using|import)\s+([\w.]+)/g)) add(match[1])
  return imports
}

function normalize(path: string): string { const parts:string[]=[]; for(const bit of path.split('/')) bit==='..'?parts.pop():bit!=='.'&&parts.push(bit); return parts.join('/') }
function resolveImport(source: string, specifier: string, allPaths: Set<string>): string | undefined {
  if (!specifier.startsWith('.')) return undefined
  const base = source.split('/').slice(0,-1).join('/'); const candidate = normalize(`${base}/${specifier}`)
  const suffixes = ['', '.ts','.tsx','.js','.jsx','.py','.rs','.go','/index.ts','/index.tsx','/index.js','/__init__.py']
  return suffixes.map((suffix)=>candidate+suffix).find((path)=>allPaths.has(path))
}

export function analyzeProject(name: string, input: SourceFileInput[]): ProjectAnalysis {
  const accepted = input.filter((file)=>!IGNORED.test(file.path) && file.size <= 1_000_000 && detectLanguage(file.path,file.content)!=='Binary/Asset')
  const paths = new Set(accepted.map((file)=>file.path)); const languages:Record<string,number>={}; const connections:ProjectConnection[]=[]
  const files = accepted.map((file):AnalyzedFile=>{
    const language=detectLanguage(file.path,file.content); languages[language]=(languages[language]??0)+1
    const imports=extractImports(language,file.content).map((specifier):ImportReference=>{const resolvedPath=resolveImport(file.path,specifier,paths);const external=!resolvedPath;connections.push({source:file.path,target:resolvedPath??specifier,specifier,external,type:'import'});return {specifier,resolvedPath,external}})
    return {...file,language,imports,lines:file.content ? file.content.split('\n').length : 0}
  })
  return {name,files,connections,languages,skipped:input.length-accepted.length}
}
