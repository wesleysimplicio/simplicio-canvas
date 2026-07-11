export interface WorkspacePreferences { version: 1; activeTab?: string; openTabs: string[]; layout: Record<string, number>; manualPositions: Record<string, { x: number; z: number }>; shortcuts: Record<string, string>; settings: Record<string, string | boolean | number> }
export const DEFAULT_PREFERENCES: WorkspacePreferences = { version: 1, openTabs: [], layout: {}, manualPositions: {}, shortcuts: { 'canvas.open': 'ctrl+k ctrl+c', 'canvas.search': 'ctrl+p' }, settings: { 'editor.wordWrap': true, 'editor.reducedMotion': false } }

export function normalizePreferences(value: unknown): WorkspacePreferences {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_PREFERENCES)
  const raw = value as Partial<WorkspacePreferences>; if (raw.version !== 1) return structuredClone(DEFAULT_PREFERENCES)
  return { ...structuredClone(DEFAULT_PREFERENCES), ...raw, openTabs: Array.isArray(raw.openTabs) ? raw.openTabs.filter((item): item is string => typeof item === 'string') : [], layout: { ...DEFAULT_PREFERENCES.layout, ...(raw.layout ?? {}) }, manualPositions: { ...DEFAULT_PREFERENCES.manualPositions, ...(raw.manualPositions ?? {}) }, shortcuts: { ...DEFAULT_PREFERENCES.shortcuts, ...(raw.shortcuts ?? {}) }, settings: { ...DEFAULT_PREFERENCES.settings, ...(raw.settings ?? {}) } }
}

export interface PaletteCommand { id: string; label: string; keybinding?: string; category: 'canvas' | 'editor' | 'workspace' | 'mapper'; run: () => void | Promise<void> }
export function searchCommands(commands: PaletteCommand[], query: string): PaletteCommand[] { const needle = query.trim().toLowerCase(); return commands.filter((command) => !needle || `${command.id} ${command.label} ${command.category}`.toLowerCase().includes(needle)).sort((a, b) => a.label.localeCompare(b.label)) }

export interface PreferenceStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const PREFERENCES_STORAGE_KEY = 'simplicio-canvas.preferences.v1'
export function normalizeShortcut(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, ' ') }
export function shortcutConflicts(shortcuts: Record<string, string>): Array<{ shortcut: string; commands: string[] }> { const groups = new Map<string, string[]>(); Object.entries(shortcuts).forEach(([command, shortcut]) => { const key = normalizeShortcut(shortcut); if (!key) return; groups.set(key, [...(groups.get(key) ?? []), command]) }); return [...groups.entries()].filter(([, commands]) => commands.length > 1).map(([shortcut, commands]) => ({ shortcut, commands })) }

export class PreferencesStore {
  private preferences: WorkspacePreferences
  constructor(private readonly storage: PreferenceStorage, private readonly key = PREFERENCES_STORAGE_KEY) { this.preferences = this.read() }
  private read(): WorkspacePreferences { try { const raw = this.storage.getItem(this.key); return normalizePreferences(raw ? JSON.parse(raw) : undefined) } catch { return normalizePreferences(undefined) } }
  get(): WorkspacePreferences { return structuredClone(this.preferences) }
  save(next: unknown): WorkspacePreferences { this.preferences = normalizePreferences(next); this.storage.setItem(this.key, JSON.stringify(this.preferences)); return this.get() }
  setShortcut(command: string, shortcut: string): WorkspacePreferences { const normalized = normalizeShortcut(shortcut); if (!/^[a-z0-9+ ._-]+$/i.test(normalized)) throw new Error('shortcut contains unsupported characters'); const next = this.get(); next.shortcuts[command] = normalized; if (shortcutConflicts(next.shortcuts).length) throw new Error('shortcut conflicts with another command'); return this.save(next) }
  reset(): WorkspacePreferences { this.storage.removeItem(this.key); this.preferences = normalizePreferences(undefined); return this.get() }
  export(): string { return JSON.stringify(this.preferences) }
  import(serialized: string): WorkspacePreferences { let parsed: unknown; try { parsed = JSON.parse(serialized) } catch { throw new Error('invalid preferences JSON') } return this.save(parsed) }
}
