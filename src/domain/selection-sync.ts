import type { CanvasSelection } from './canvas-sdk'
import type { CanvasMessage } from './extension-protocol'

export interface EditorLocation { path: string; line: number; column: number }
export interface SelectionSync { fromEditor(location: EditorLocation): CanvasMessage; fromCanvas(selection: CanvasSelection): CanvasMessage | undefined }

export function createSelectionSync(knownPaths: () => Iterable<string>): SelectionSync {
  return {
    fromEditor: (location) => ({ type: 'canvas/select', selection: { path: location.path } }),
    fromCanvas: (selection) => {
      if (!selection.path || !Array.from(knownPaths()).includes(selection.path)) return undefined
      return { type: 'editor/reveal', path: selection.path, line: 1, column: 1 }
    },
  }
}
