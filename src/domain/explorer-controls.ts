export interface ExplorerItem { id: string; name: string; path?: string; layer?: string; kind?: string }
export interface ExplorerFilter { query?: string; layers?: Set<string>; kinds?: Set<string> }
export function filterExplorerItems<T extends ExplorerItem>(items: T[], filter: ExplorerFilter): T[] {
  const query = (filter.query ?? '').trim().toLowerCase()
  return items.filter((item) => (!query || `${item.name} ${item.path ?? ''}`.toLowerCase().includes(query)) && (!filter.layers?.size || filter.layers.has(item.layer ?? '')) && (!filter.kinds?.size || filter.kinds.has(item.kind ?? '')))
}
export interface Cluster<T extends ExplorerItem> { id: string; key: string; count: number; items: T[] }
export function clusterExplorerItems<T extends ExplorerItem>(items: T[], size = 500): Cluster<T>[] {
  const groups = new Map<string, T[]>(); for (const item of items) { const key = item.path?.split('/')[0] || item.layer || 'root'; const group = groups.get(key) ?? []; group.push(item); groups.set(key, group) }
  return [...groups.entries()].map(([key, group]) => ({ id: `cluster:${key}`, key, count: group.length, items: group.slice(0, size) })).sort((a, b) => a.key.localeCompare(b.key))
}
export function minimapBounds(items: Array<{ x: number; z: number }>): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (!items.length) return { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }
  return { minX: Math.min(...items.map((item) => item.x)), maxX: Math.max(...items.map((item) => item.x)), minZ: Math.min(...items.map((item) => item.z)), maxZ: Math.max(...items.map((item) => item.z)) }
}
