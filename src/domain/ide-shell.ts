export const DEFAULT_WORKSPACE = {
  owner: 'wesleysimplicio',
  repository: 'simplicio-loop',
  url: 'https://github.com/wesleysimplicio/simplicio-loop',
} as const

export const IDE_ACTIVITIES = [
  { id: 'explorer', icon: '▱', label: 'Explorer' },
  { id: 'search', icon: '⌕', label: 'Search' },
  { id: 'source-control', icon: '⑂', label: 'Source Control' },
  { id: 'run', icon: '▷', label: 'Run and Debug' },
  { id: 'extensions', icon: '▦', label: 'Extensions' },
] as const

export type ActivityId = typeof IDE_ACTIVITIES[number]['id']
export function nextActivity(active: ActivityId | null, selected: ActivityId): ActivityId | null {
  return active === selected ? null : selected
}
