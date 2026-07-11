export interface WorkspaceTrust { trusted: boolean; root: string }

export function isSafeWorkspacePath(root: string, candidate: string): boolean {
  const normalize = (value: string) => {
    const result: string[] = []
    for (const part of value.replace(/\\/g, '/').split('/')) {
      if (!part || part === '.') continue
      if (part === '..') { result.pop(); continue }
      result.push(part)
    }
    return `/${result.join('/')}`
  }
  const normalizedRoot = normalize(root).replace(/\/$/, '')
  const normalized = normalize(candidate)
  return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`)
}

export function canApply(trust: WorkspaceTrust, candidate: string): boolean {
  return trust.trusted && isSafeWorkspacePath(trust.root, candidate)
}
