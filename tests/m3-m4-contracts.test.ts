import { describe, expect, it, vi } from 'vitest'
import { buildArchitectureGraph } from '../src/domain/architecture'
import { CANVAS_SDK_VERSION, createMemoryStore, mountCanvas, validateCapabilityManifest } from '../src/domain/canvas-sdk'
import { isWorkspaceRelativePath, parseCanvasMessage, strictCsp } from '../src/domain/extension-protocol'
import { createSelectionSync } from '../src/domain/selection-sync'
import { IncrementalWorkspaceWatcher } from '../src/domain/workspace-watcher'
import { analyzeImpact, explainNode } from '../src/domain/architecture-assistant'
import { previewProposal, validateProposal } from '../src/domain/ai-contracts'
import { AuditLog } from '../src/domain/audit-log'
import { canApply } from '../src/domain/workspace-security'
import { createExtensionApplyService } from '../src/domain/extension-apply'
import { verifyTransformation } from '../src/domain/transformation-eval'

const graph = buildArchitectureGraph(['src/ui/app.ts', 'src/application/run.ts', 'src/domain/task.ts', 'tests/task.test.ts'])

describe('M3 canvas and extension contracts', () => {
  it('mounts without browser filesystem dependencies and synchronizes selection', () => {
    const store = createMemoryStore(graph); const seen: string[] = []
    const canvas = mountCanvas({ store, onSelection: (selection) => seen.push(selection.path ?? '') })
    expect(canvas.version).toBe(CANVAS_SDK_VERSION)
    canvas.select({ nodeId: graph.nodes[0].id, path: graph.nodes[0].path })
    expect(seen).toEqual([graph.nodes[0].path]); expect(canvas.getSelection().nodeId).toBe(graph.nodes[0].id)
    canvas.dispose(); canvas.select({ path: 'ignored.ts' }); expect(canvas.getSelection().path).toBe(graph.nodes[0].path)
  })

  it('validates extension capabilities and explicit permissions', () => {
    expect(validateCapabilityManifest({ id: 'mapper', version: '1.0.0', capabilities: ['analyzer'], permissions: ['read-workspace'] })).toEqual([])
    expect(validateCapabilityManifest({ id: 'Bad Name', version: '1', capabilities: [], permissions: ['write-workspace'] })).toHaveLength(4)
  })

  it('validates typed extension messages and rejects malformed payloads', () => {
    expect(parseCanvasMessage('{"type":"canvas/ready","protocol":1}')).toMatchObject({ type: 'canvas/ready' })
    expect(parseCanvasMessage('{"type":"canvas/ready","protocol":99}')).toBeUndefined()
    expect(parseCanvasMessage('{"type":"editor/reveal","path":"../../secret"}')).toBeUndefined()
    expect(isWorkspaceRelativePath('src/main.ts')).toBe(true)
    expect(isWorkspaceRelativePath('/etc/passwd')).toBe(false)
    expect(isWorkspaceRelativePath('src/../secret')).toBe(false)
    expect(strictCsp('abcDEF_0123456789')).toContain("default-src 'none'")
    expect(() => strictCsp('short')).toThrow()
  })

  it('degrades stale selection and maps known editor files', () => {
    const sync = createSelectionSync(() => graph.nodes.map((node) => node.path))
    expect(sync.fromCanvas({ path: 'missing.ts' })).toBeUndefined()
    expect(sync.fromCanvas({ path: graph.nodes[0].path })).toMatchObject({ type: 'editor/reveal', path: graph.nodes[0].path })
    expect(sync.fromEditor({ path: graph.nodes[1].path, line: 2, column: 1 })).toMatchObject({ type: 'canvas/select' })
  })

  it('coalesces incremental workspace changes', async () => {
    const scan = vi.fn(); const watcher = new IncrementalWorkspaceWatcher(scan, 5)
    watcher.enqueue({ path: 'src/a.ts', kind: 'change' }); watcher.enqueue({ path: 'src/a.ts', kind: 'change' }); watcher.enqueue({ path: 'src/b.ts', kind: 'create' })
    await watcher.flush(); expect(scan).toHaveBeenCalledOnce(); expect(scan.mock.calls[0][0]).toHaveLength(2)
  })
})

describe('M4 AI intent, explanation and safety contracts', () => {
  const request = { id: 'r1', text: 'move task', graphVersion: 'v1', createdAt: '2026-07-11T00:00:00Z' }
  const proposal = { request, assumptions: [], operations: [{ kind: 'move' as const, target: 'n1', details: { layer: 'domain' } }], risks: [], evidence: ['n1'], provider: 'local' }
  it('validates preview-only typed proposals', () => {
    expect(validateProposal(proposal).valid).toBe(true)
    expect(() => previewProposal({ ...proposal, provider: '' })).toThrow()
    expect(previewProposal(proposal)).not.toBe(proposal)
  })
  it('answers with graph citations and computes bounded impact', () => {
    const answer = explainNode(graph, graph.nodes[0].id); expect(answer.citations[0].path).toBe(graph.nodes[0].path); expect(answer.uncertain).toBe(false)
    const impact = analyzeImpact(graph, graph.nodes[0].id); expect(impact.affectedNodes).toContain(graph.nodes[0].id); expect(impact.boundaries.length).toBeGreaterThan(0)
    expect(explainNode(graph, 'missing').uncertain).toBe(true)
  })
  it('keeps an append-only audit trail and enforces trust/path boundaries', () => {
    const log = new AuditLog(); log.append({ id: '1', action: 'proposal', actor: 'ai', timestamp: request.createdAt, details: {} }); expect(log.list()).toHaveLength(1)
    expect(canApply({ trusted: true, root: '/workspace' }, '/workspace/src/a.ts')).toBe(true)
    expect(canApply({ trusted: false, root: '/workspace' }, '/workspace/src/a.ts')).toBe(false)
    expect(canApply({ trusted: true, root: '/workspace' }, '/workspace/../secret')).toBe(false)
  })
  it('retains red/green transformation evidence and rejects failed verification', () => {
    expect(verifyTransformation('proposal-1', ['tests/task.test.ts'], true, true)).toMatchObject({ before: 'green', after: 'green', accepted: true })
    expect(verifyTransformation('proposal-2', ['tests/task.test.ts'], true, false)).toMatchObject({ before: 'green', after: 'rejected', accepted: false })
  })
  it('keeps extension apply host-side and requires preview, trust and checkpoint receipt', async () => {
    const service = createExtensionApplyService({ trusted: true, root: '/workspace' }, { write: vi.fn(async () => 'checkpoint-1') })
    const plan = { version: 1 as const, operations: [], files: ['/workspace/a.ts'], symbols: [], imports: [], tests: [], summary: 'one', readonly: true as const }
    const request = { plan, diffs: [{ path: '/workspace/a.ts', before: 'a', after: 'b' }], confirmation: 'APPLY', workspaceRoot: '/workspace', changedPaths: ['/workspace/a.ts'] }
    expect(service.preview(request).allowed).toBe(true); expect((await service.apply(request)).checkpointId).toBe('checkpoint-1')
    expect(() => service.preview({ ...request, changedPaths: ['/etc/passwd'] })).not.toThrow(); expect(service.preview({ ...request, changedPaths: ['/etc/passwd'] }).allowed).toBe(false)
  })
})
