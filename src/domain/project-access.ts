export function editorMode(path: string, writablePaths: Set<string>): 'writable' | 'download-only' {
  return writablePaths.has(path) ? 'writable' : 'download-only'
}
