/** Renderer/Monaco-neutral editor state. Source bytes stay in the host. */
export interface EditorLocation { path: string; line: number; column: number }
export interface EditorTab { id: string; path: string; language: string; content: string; savedContent: string; dirty: boolean; location?: EditorLocation }
export interface EditorState { tabs: EditorTab[]; activeId?: string }

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const tabId = (path: string) => `file:${path}`

export function createEditorState(): EditorState { return { tabs: [] } }

export function openEditorFile(state: EditorState, input: { path: string; content: string; language?: string; line?: number; column?: number }): EditorState {
  const id = tabId(input.path)
  const existing = state.tabs.find((tab) => tab.id === id)
  const location = { path: input.path, line: Math.max(1, input.line ?? 1), column: Math.max(1, input.column ?? 1) }
  if (existing) return { tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, location } : tab), activeId: id }
  const tab: EditorTab = { id, path: input.path, language: input.language ?? 'plaintext', content: input.content, savedContent: input.content, dirty: false, location }
  return { tabs: [...state.tabs, tab], activeId: id }
}

export function updateEditorContent(state: EditorState, id: string, content: string): EditorState {
  return { ...state, tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, content, dirty: content !== tab.savedContent } : tab) }
}

export function markEditorSaved(state: EditorState, id: string, content?: string): EditorState {
  return { ...state, tabs: state.tabs.map((tab) => { if (tab.id !== id) return tab; const next = content ?? tab.content; return { ...tab, content: next, savedContent: next, dirty: false } }) }
}

export function canCloseEditorTab(tab: EditorTab, force = false): boolean { return force || !tab.dirty }

export function closeEditorTab(state: EditorState, id: string, force = false): EditorState {
  const tab = state.tabs.find((item) => item.id === id)
  if (!tab || !canCloseEditorTab(tab, force)) return state
  const tabs = state.tabs.filter((item) => item.id !== id)
  return { tabs, activeId: state.activeId === id ? tabs.at(-1)?.id : state.activeId }
}

export function revealEditorLocation(state: EditorState, id: string, line: number, column = 1): EditorState {
  return { ...state, tabs: state.tabs.map((tab) => tab.id === id ? { ...tab, location: { path: tab.path, line: clamp(Math.trunc(line), 1, Number.MAX_SAFE_INTEGER), column: clamp(Math.trunc(column), 1, Number.MAX_SAFE_INTEGER) } } : tab), activeId: state.tabs.some((tab) => tab.id === id) ? id : state.activeId }
}

export interface WorkspaceFile { path: string; language?: string; size?: number; generated?: boolean; binary?: boolean }
export interface ExplorerEntry { name: string; path: string; kind: 'file' | 'directory'; children?: ExplorerEntry[]; badges: Array<'generated' | 'binary' | 'ignored'> }

const ignored = /^(?:node_modules|dist|build|coverage|\.git|\.venv|venv)(?:\/|$)/i
const generated = /(?:\.generated\.|\.g\.|\/generated\/|\/dist\/|\/build\/)/i
const binary = /\.(?:png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|mp3|mp4)$/i

export function buildExplorerTree(files: WorkspaceFile[], ignoredPaths: string[] = []): ExplorerEntry[] {
  const root: ExplorerEntry[] = []
  const ignoredSet = new Set(ignoredPaths)
  for (const file of files) {
    const path = file.path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    if (!path) continue
    const parts = path.split('/'); let level = root; let prefix = ''
    parts.forEach((name, index) => {
      prefix = prefix ? `${prefix}/${name}` : name
      const kind = index === parts.length - 1 ? 'file' : 'directory'
      let entry = level.find((item) => item.name === name)
      if (!entry) { entry = { name, path: prefix, kind, badges: [] }; if (kind === 'directory') entry.children = []; level.push(entry) }
      if (kind === 'directory') level = entry.children!
      else { entry.badges = [...(generated.test(path) || file.generated ? ['generated' as const] : []), ...(binary.test(path) || file.binary ? ['binary' as const] : []), ...(ignored.test(path) || ignoredSet.has(path) ? ['ignored' as const] : [])] }
    })
  }
  const sort = (entries: ExplorerEntry[]) => entries.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'directory' ? -1 : 1)).forEach((entry) => entry.children && sort(entry.children))
  sort(root); return root
}

export type WorkspaceMutation = { type: 'create' | 'rename' | 'delete'; path: string; nextPath?: string }
export function validateWorkspaceMutation(mutation: WorkspaceMutation): string[] {
  const errors: string[] = []; const safe = (value: string) => value.length > 0 && !value.startsWith('/') && !value.split('/').includes('..') && !/[\u0000]/.test(value)
  if (!safe(mutation.path)) errors.push('workspace path must be relative and cannot contain ..')
  if (mutation.type === 'rename' && (!mutation.nextPath || !safe(mutation.nextPath))) errors.push('rename requires a safe destination path')
  return errors
}
