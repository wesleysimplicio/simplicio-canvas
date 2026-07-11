import type { ArchitectureGraph } from './architecture'

/** Renderer-neutral contract shared by the web app and future editor hosts. */
export const CANVAS_SDK_VERSION = '0.1'

export interface CanvasSelection { nodeId?: string; edgeId?: string; path?: string; symbol?: string }
export interface CanvasStore { getGraph(): ArchitectureGraph; setSelection(selection: CanvasSelection): void; getSelection(): CanvasSelection }
export interface CanvasMountOptions { store: CanvasStore; onSelection?: (selection: CanvasSelection) => void; onDispose?: () => void }
export interface CanvasHandle { readonly version: string; getSelection(): CanvasSelection; select(selection: CanvasSelection): void; dispose(): void }

export type CanvasCapability = 'graph-provider' | 'analyzer' | 'command' | 'inspector' | 'decoration' | 'visual-mode'
export interface CanvasCapabilityManifest { id: string; version: string; capabilities: CanvasCapability[]; permissions: Array<'read-graph' | 'read-workspace' | 'write-workspace' | 'run-process'> }
export interface CanvasExtension { manifest: CanvasCapabilityManifest; activate(context: { sdkVersion: string }): void | Promise<void>; deactivate?(): void | Promise<void> }

export function validateCapabilityManifest(manifest: CanvasCapabilityManifest): string[] {
  const errors: string[] = []
  if (!/^[a-z][a-z0-9._-]{1,63}$/.test(manifest.id)) errors.push('id must be a stable lowercase identifier')
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) errors.push('version must be semver')
  if (!manifest.capabilities.length) errors.push('at least one capability is required')
  if (manifest.permissions.includes('write-workspace') && !manifest.permissions.includes('read-workspace')) errors.push('write-workspace requires read-workspace')
  return errors
}

export function createMemoryStore(graph: ArchitectureGraph): CanvasStore {
  let selection: CanvasSelection = {}
  return { getGraph: () => graph, setSelection: (next) => { selection = { ...next } }, getSelection: () => ({ ...selection }) }
}

/** Adapter point for a renderer. No DOM or filesystem access belongs in this module. */
export function mountCanvas(options: CanvasMountOptions): CanvasHandle {
  let disposed = false
  return {
    version: CANVAS_SDK_VERSION,
    getSelection: () => options.store.getSelection(),
    select: (selection) => { if (!disposed) { options.store.setSelection(selection); options.onSelection?.(selection) } },
    dispose: () => { if (!disposed) { disposed = true; options.onDispose?.() } },
  }
}
