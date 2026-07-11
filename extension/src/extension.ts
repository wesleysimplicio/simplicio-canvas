import { CANVAS_SDK_VERSION } from '../../src/domain/canvas-sdk'
import { EXTENSION_PROTOCOL_VERSION, strictCsp } from '../../src/domain/extension-protocol'

export interface WebviewPanelLike { html: string; onDispose(listener: () => void): void }
export interface ExtensionHostLike { registerCommand(command: string, handler: () => void): { dispose(): void }; onDeactivate(listener: () => void): void }
export interface ExtensionDisposable { dispose(): void }

/** Host-neutral entry point; the real VS Code adapter will inject its panel. */
export function openCanvas(panel: WebviewPanelLike, nonce: string): void {
  panel.html = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${strictCsp(nonce)}"><main data-canvas-sdk="${CANVAS_SDK_VERSION}" data-protocol="${EXTENSION_PROTOCOL_VERSION}"></main>`
  panel.onDispose(() => { /* release host subscriptions in the concrete adapter */ })
}

/** Host-neutral activation seam used by VS Code and Cursor adapters. */
export function activate(host: ExtensionHostLike, open: () => void): ExtensionDisposable {
  const command = host.registerCommand('simplicioCanvas.open', open); let disposed = false
  const dispose = () => { if (!disposed) { disposed = true; command.dispose() } }
  host.onDeactivate(dispose); return { dispose }
}
