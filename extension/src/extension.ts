import { CANVAS_SDK_VERSION } from '../../src/domain/canvas-sdk'
import { EXTENSION_PROTOCOL_VERSION, strictCsp } from '../../src/domain/extension-protocol'

export interface WebviewPanelLike { html: string; onDispose(listener: () => void): void }

/** Host-neutral entry point; the real VS Code adapter will inject its panel. */
export function openCanvas(panel: WebviewPanelLike, nonce: string): void {
  panel.html = `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${strictCsp(nonce)}"><main data-canvas-sdk="${CANVAS_SDK_VERSION}" data-protocol="${EXTENSION_PROTOCOL_VERSION}"></main>`
  panel.onDispose(() => { /* release host subscriptions in the concrete adapter */ })
}
