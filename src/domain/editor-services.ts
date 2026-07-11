import { canCloseEditorTab, closeEditorTab, markEditorSaved, openEditorFile, updateEditorContent, type EditorState, type EditorTab } from './editor-workspace'

export type DiagnosticSeverity = 'error' | 'warning' | 'info'
export interface EditorDiagnostic { severity: DiagnosticSeverity; message: string; line: number; column: number; source: 'syntax' | 'mapper' | 'host' }
export interface FindMatch { line: number; column: number; length: number; text: string }
export interface ReparseResult { path: string; content: string; diagnostics: EditorDiagnostic[]; changedPaths: string[] }
export type IncrementalReparser = (path: string, content: string) => Promise<ReparseResult>

/** Lightweight diagnostics fallback; a Monaco adapter can replace this provider. */
export function syntaxDiagnostics(content: string, language = 'plaintext'): EditorDiagnostic[] {
  if (language === 'plaintext' || language === 'Markdown' || language === 'JSON') return []
  const diagnostics: EditorDiagnostic[] = []; const stack: Array<{ token: string; line: number; column: number }> = []; const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
  content.split('\n').forEach((line, lineIndex) => { for (let index = 0; index < line.length; index += 1) { const token = line[index]; if (pairs[token]) stack.push({ token, line: lineIndex + 1, column: index + 1 }); else if (Object.values(pairs).includes(token)) { const last = stack.pop(); if (!last || pairs[last.token] !== token) diagnostics.push({ severity: 'error', message: `Unexpected '${token}'`, line: lineIndex + 1, column: index + 1, source: 'syntax' }) } } })
  stack.forEach((item) => diagnostics.push({ severity: 'error', message: `Unclosed '${item.token}'`, line: item.line, column: item.column, source: 'syntax' })); return diagnostics
}

export function findInEditor(content: string, query: string, options: { caseSensitive?: boolean; wholeWord?: boolean } = {}): FindMatch[] {
  if (!query) return []; const result: FindMatch[] = []; const needle = options.caseSensitive ? query : query.toLowerCase(); const boundary = options.wholeWord ? '\\b' : ''
  const pattern = options.wholeWord ? new RegExp(`${boundary}${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${boundary}`, options.caseSensitive ? 'g' : 'gi') : undefined
  content.split('\n').forEach((line, lineIndex) => { if (pattern) for (const match of line.matchAll(pattern)) result.push({ line: lineIndex + 1, column: (match.index ?? 0) + 1, length: match[0].length, text: match[0] }); else { const haystack = options.caseSensitive ? line : line.toLowerCase(); let offset = 0; while (true) { const found = haystack.indexOf(needle, offset); if (found < 0) break; result.push({ line: lineIndex + 1, column: found + 1, length: query.length, text: line.slice(found, found + query.length) }); offset = found + Math.max(1, query.length) } } }); return result
}

export class IncrementalEditorController {
  constructor(private state: EditorState, private readonly reparse: IncrementalReparser) {}
  getState(): EditorState { return this.state }
  open(input: { path: string; content: string; language?: string; line?: number; column?: number }): EditorTab { this.state = openEditorFile(this.state, input); return this.state.tabs.find((tab) => tab.id === this.state.activeId)! }
  update(id: string, content: string): EditorTab { this.state = updateEditorContent(this.state, id, content); return this.state.tabs.find((tab) => tab.id === id)! }
  async save(id: string): Promise<ReparseResult> { const tab = this.state.tabs.find((item) => item.id === id); if (!tab) throw new Error(`Editor tab not found: ${id}`); const result = await this.reparse(tab.path, tab.content); this.state = markEditorSaved(this.state, id); return result }
  close(id: string, force = false): boolean { const tab = this.state.tabs.find((item) => item.id === id); if (!tab || !canCloseEditorTab(tab, force)) return false; this.state = closeEditorTab(this.state, id, force); return true }
}
