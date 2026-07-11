import type { ArchitectureGraph } from './architecture'

/** Renderer-neutral contract shared by the web app and future editor hosts. */
export const CANVAS_SDK_VERSION = '0.1'

export interface CanvasSelection { nodeId?: string; edgeId?: string; path?: string; symbol?: string }
export interface CanvasStore { getGraph(): ArchitectureGraph; setSelection(selection: CanvasSelection): void; getSelection(): CanvasSelection }
export interface CanvasMountOptions { store: CanvasStore; onSelection?: (selection: CanvasSelection) => void; onDispose?: () => void }
export interface CanvasHandle { readonly version: string; getSelection(): CanvasSelection; select(selection: CanvasSelection): void; dispose(): void }

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
