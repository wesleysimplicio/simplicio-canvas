import { previewApply, type ApplyReceipt, type ApplyRequest, createApplyReceipt, type FileDiff } from './apply-gate'
import { canApply, type WorkspaceTrust } from './workspace-security'

export interface ExtensionApplyRequest extends ApplyRequest { workspaceRoot: string; changedPaths: string[] }
export interface ExtensionApplyService { preview(request: ExtensionApplyRequest): { allowed: boolean; errors: string[]; diffs: FileDiff[] }; apply(request: ExtensionApplyRequest): Promise<ApplyReceipt> }
export interface WorkspaceWriter { write(diffs: FileDiff[]): Promise<string> }

/** Host-side gate used by VS Code/Cursor adapters. The webview can only preview. */
export function createExtensionApplyService(trust: WorkspaceTrust, writer: WorkspaceWriter): ExtensionApplyService {
  const preview = (request: ExtensionApplyRequest) => {
    const errors = request.changedPaths.filter((path) => !canApply(trust, path)).map((path) => `path outside trusted workspace: ${path}`)
    return { ...previewApply(request), errors: [...errors, ...previewApply(request).errors], allowed: errors.length === 0 && previewApply(request).allowed }
  }
  return { preview, apply: async (request) => { const result = preview(request); if (!result.allowed) throw new Error(`Apply blocked: ${result.errors.join('; ')}`); const checkpointId = await writer.write(request.diffs); return createApplyReceipt(request.plan, true, checkpointId) } }
}
