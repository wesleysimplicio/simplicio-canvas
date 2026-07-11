# M3/M4 integration contracts

The Canvas domain is intentionally renderer- and host-neutral. The web entrypoint
can mount the same store used by an editor extension through `mountCanvas` in
`src/domain/canvas-sdk.ts`.

## Host protocol

`src/domain/extension-protocol.ts` defines the versioned messages used by a VS
Code/Cursor webview. Hosts must validate every inbound message with
`parseCanvasMessage`, use a nonce-backed `strictCsp`, and treat unknown or stale
paths as no-ops. The protocol never carries source bodies or arbitrary commands.

## Workspace updates

`IncrementalWorkspaceWatcher` coalesces editor save/create/delete/rename bursts
before invoking the scanner. The scanner remains the source of truth; a watcher
only schedules a bounded re-scan and cannot apply source changes.

## AI safety boundary

AI providers return `IntentProposal` values, not files or shell commands.
`validateProposal` and `previewProposal` run before a proposal can reach a future
change planner. Explanations cite graph nodes, uncertain answers are explicit,
and `AuditLog` records proposal/accept/reject/apply/undo events. A host must also
require workspace trust and `canApply` path checks before any future apply service.

These contracts are scaffolding for M3/M4 and deliberately do not claim that a
VSIX or autonomous code-apply service ships in the current web MVP.
