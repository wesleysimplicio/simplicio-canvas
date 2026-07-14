import { describe, expect, it, vi } from 'vitest'
import type { WorkspaceTrust } from '../src/domain/workspace-security'
import { WorkspaceCrudController, type WorkspaceFsAdapter } from '../src/domain/workspace-crud'
import { IncrementalWorkspaceWatcher, type WorkspaceEvent } from '../src/domain/workspace-watcher'
import { createWorkspaceSnapshot, recoverWorkspace } from '../src/domain/workspace-recovery'
import { createSourceControlController, createReadOnlySourceControlAdapter, type SourceControlAdapter, type SourceControlSnapshot } from '../src/domain/source-control'
import type { CanonicalGraph } from '../src/domain/graph-schema'

// System-level test: drives a full host-workspace lifecycle across the security,
// CRUD, watcher, recovery and source-control modules the way the desktop/VS Code
// host wires them together for one end-to-end editing session, rather than
// exercising any single module in isolation.
describe('workspace lifecycle (trust -> crud -> watch -> recover -> source control)', () => {
  const trust: WorkspaceTrust = { trusted: true, root: '/workspace/app' }

  function fakeFs(): WorkspaceFsAdapter & { files: Map<string, string> } {
    const files = new Map<string, string>()
    return {
      files,
      create: async (path, content = '') => { files.set(path, content) },
      rename: async (path, nextPath) => { files.set(nextPath, files.get(path) ?? ''); files.delete(path) },
      delete: async (path) => { files.delete(path) },
    }
  }

  it('creates a file, watches the change, snapshots it, and gates a protected-branch push', async () => {
    const fs = fakeFs()
    const crud = new WorkspaceCrudController(trust, fs)

    const createReceipt = await crud.create('src/domain/widget.ts', 'export class Widget {}')
    expect(createReceipt.accepted).toBe(true)
    expect(fs.files.get('/workspace/app/src/domain/widget.ts')).toBe('export class Widget {}')

    // A watcher coalesces the fs event and hands it to the host scanner exactly once.
    const scan = vi.fn<(events: WorkspaceEvent[]) => void>()
    const watcher = new IncrementalWorkspaceWatcher(scan, 10)
    watcher.enqueue({ path: 'src/domain/widget.ts', kind: 'create' })
    watcher.enqueue({ path: 'src/domain/widget.ts', kind: 'change' })
    await watcher.flush()
    expect(scan).toHaveBeenCalledTimes(1)
    expect(scan.mock.calls[0][0]).toHaveLength(1)

    // The host snapshots the workspace after the scan for crash recovery.
    const graph: CanonicalGraph = {
      schema: 'simplicio-canvas/v1',
      project: { id: 'app', name: 'App' },
      nodes: [{ id: 'widget', kind: 'file', name: 'widget.ts', path: 'src/domain/widget.ts' }],
      edges: [],
      provenance: { source: 'test', generatedAt: new Date().toISOString() },
      evidence: [],
    }
    const snapshot = createWorkspaceSnapshot(graph, { widget: { x: 0, y: 0 } }, 'rev-1')
    const recovery = recoverWorkspace(snapshot, 'restore')
    expect(recovery.status).toBe('restore')
    expect(recovery.snapshot?.graph.nodes).toHaveLength(1)

    // A tampered snapshot must be rejected rather than silently restored.
    const tampered = { ...snapshot, revision: 'rev-tampered' }
    expect(recoverWorkspace(tampered, 'restore').status).toBe('inspect')

    // Finally, source control refuses a direct push against a protected main branch.
    const protectedSnapshot: SourceControlSnapshot = { branch: 'main', ahead: 1, behind: 0, files: [], mainProtected: true, provider: 'local' }
    const adapter: SourceControlAdapter = { ...createReadOnlySourceControlAdapter(protectedSnapshot), push: vi.fn(async () => ({ receipt: 'should-not-be-called' })) }
    const controller = createSourceControlController(adapter, trust, trust.root)
    await controller.refresh()
    const pushReceipt = await controller.push()
    expect(pushReceipt.accepted).toBe(false)
    expect(pushReceipt.detail).toContain('Pull Request')
    expect(adapter.push).not.toHaveBeenCalled()
  })

  it('refuses workspace mutations when trust has not been granted', async () => {
    const untrusted: WorkspaceTrust = { trusted: false, root: '/workspace/app' }
    const fs = fakeFs()
    const crud = new WorkspaceCrudController(untrusted, fs)
    const receipt = await crud.create('src/domain/widget.ts')
    expect(receipt.accepted).toBe(false)
    expect(receipt.detail).toContain('workspace trust is required')
    expect(fs.files.size).toBe(0)
  })
})
