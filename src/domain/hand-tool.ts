export function nextHandToolState(current: boolean, key: string): boolean {
  const normalized = key.toLowerCase()
  if (normalized === 'h') return !current
  if (normalized === 'escape') return false
  return current
}
