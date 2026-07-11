export interface WorkspacePreferences { version: 1; activeTab?: string; openTabs: string[]; layout: Record<string, number>; manualPositions: Record<string, { x: number; z: number }>; shortcuts: Record<string, string>; settings: Record<string, string | boolean | number> }
export const DEFAULT_PREFERENCES: WorkspacePreferences = { version: 1, openTabs: [], layout: {}, manualPositions: {}, shortcuts: { 'canvas.open': 'ctrl+k ctrl+c', 'canvas.search': 'ctrl+p' }, settings: { 'editor.wordWrap': true, 'editor.reducedMotion': false } }

export function normalizePreferences(value: unknown): WorkspacePreferences {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_PREFERENCES)
  const raw = value as Partial<WorkspacePreferences>; if (raw.version !== 1) return structuredClone(DEFAULT_PREFERENCES)
  return { ...structuredClone(DEFAULT_PREFERENCES), ...raw, openTabs: Array.isArray(raw.openTabs) ? raw.openTabs.filter((item): item is string => typeof item === 'string') : [], layout: { ...DEFAULT_PREFERENCES.layout, ...(raw.layout ?? {}) }, manualPositions: { ...DEFAULT_PREFERENCES.manualPositions, ...(raw.manualPositions ?? {}) }, shortcuts: { ...DEFAULT_PREFERENCES.shortcuts, ...(raw.shortcuts ?? {}) }, settings: { ...DEFAULT_PREFERENCES.settings, ...(raw.settings ?? {}) } }
}

export interface PaletteCommand { id: string; label: string; keybinding?: string; category: 'canvas' | 'editor' | 'workspace' | 'mapper'; run: () => void | Promise<void> }
export function searchCommands(commands: PaletteCommand[], query: string): PaletteCommand[] { const needle = query.trim().toLowerCase(); return commands.filter((command) => !needle || `${command.id} ${command.label} ${command.category}`.toLowerCase().includes(needle)).sort((a, b) => a.label.localeCompare(b.label)) }
