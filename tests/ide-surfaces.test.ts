import { describe, expect, it, vi } from 'vitest'
import { buildArchitectureGraph } from '../src/domain/architecture'
import { buildExplorerTree, closeEditorTab, createEditorState, openEditorFile, updateEditorContent, canCloseEditorTab, validateWorkspaceMutation } from '../src/domain/editor-workspace'
import { proposeEdgeConnection, proposeEdgeReversal } from '../src/domain/edge-refactor'
import { searchCommands, normalizePreferences, DEFAULT_PREFERENCES } from '../src/domain/workspace-preferences'
import { createReadOnlySourceControlAdapter, createSourceControlController, validateSourceControlAction, shouldRequirePullRequest, type SourceControlSnapshot } from '../src/domain/source-control'
import { BrowserTerminalAdapter, TERMINAL_CONFIRMATION, validateTerminalRequest } from '../src/domain/terminal-adapter'
import { createRunSession, startRunSession, validateLaunchConfiguration } from '../src/domain/run-debug'

const graph = buildArchitectureGraph(['src/a.ts', 'src/b.ts', 'tests/a.test.ts'])
const trust = { trusted: true, root: '/workspace' }

describe('IDE surface contracts', () => {
  it('keeps editor tabs dirty until explicit save and protects dirty close', () => {
    let state = openEditorFile(createEditorState(), { path: 'src/a.ts', content: 'one', language: 'typescript', line: 2 })
    const id = state.activeId!
    state = updateEditorContent(state, id, 'two')
    expect(state.tabs[0].dirty).toBe(true); expect(canCloseEditorTab(state.tabs[0])).toBe(false)
    state = closeEditorTab(state, id); expect(state.tabs).toHaveLength(1)
    state = closeEditorTab(state, id, true); expect(state.tabs).toHaveLength(0)
  })

  it('reuses a tab and builds a sorted explorer tree with badges', () => {
    let state = openEditorFile(createEditorState(), { path: 'src/a.ts', content: 'one' })
    state = openEditorFile(state, { path: 'src/a.ts', content: 'new', line: 5 }); expect(state.tabs).toHaveLength(1); expect(state.tabs[0].content).toBe('one'); expect(state.tabs[0].location?.line).toBe(5)
    const tree = buildExplorerTree([{ path: 'src/z.ts' }, { path: 'src/generated/foo.generated.ts' }, { path: 'README.md' }, { path: 'node_modules/x.js' }])
    expect(tree.map((item) => item.name)).toEqual(['node_modules', 'src', 'README.md']); expect(tree[1].children?.find((item) => item.name.includes('generated'))?.children?.[0].badges).toContain('generated'); expect(tree[0].children?.[0].badges).toContain('ignored')
  })

  it('rejects unsafe workspace mutations', () => { expect(validateWorkspaceMutation({ type: 'rename', path: 'src/a.ts', nextPath: '../secret.ts' })).toContain('rename requires a safe destination path') })

  it('proposes typed edges and blocks cycles and duplicate reversals', () => {
    const a = graph.nodes[0].id; const b = graph.nodes[1].id; const edge = { from: a, to: b, type: 'depends' as const }
    expect(proposeEdgeConnection({ ...graph, edges: [] }, edge).operations).toHaveLength(1)
    expect(proposeEdgeConnection({ ...graph, edges: [{ from: b, to: a, type: 'depends' }] }, edge).errors).toContain('connection would create a dependency cycle')
    expect(proposeEdgeReversal({ ...graph, edges: [edge] }, edge).operations).toHaveLength(2)
  })

  it('keeps source control actions trusted and main protection visible', () => {
    expect(validateSourceControlAction({ trusted: false, root: '/workspace' }, '/workspace', ['/workspace/a.ts'], 'x')).toContain('workspace trust is required')
    const snapshot: SourceControlSnapshot = { branch: 'main', ahead: 1, behind: 0, files: [], mainProtected: true, provider: 'local' }; expect(shouldRequirePullRequest(snapshot)).toBe(true)
  })

  it('returns auditable receipts and blocks direct push to protected main', async () => {
    const snapshot: SourceControlSnapshot = { branch: 'main', ahead: 1, behind: 0, files: [{ path: '/workspace/a.ts', state: 'modified', staged: false, diff: '-a\n+b' }], mainProtected: true, provider: 'local' }
    const controller = createSourceControlController(createReadOnlySourceControlAdapter(snapshot), trust, '/workspace')
    expect((await controller.refresh()).branch).toBe('main')
    expect((await controller.stage(['/workspace/a.ts'])).accepted).toBe(true)
    const commit = await controller.commit(['/workspace/a.ts'], 'update'); expect(commit.accepted).toBe(false); expect(commit.detail).toContain('Pull Request')
    const push = await controller.push(); expect(push.accepted).toBe(false); expect(push.detail).toContain('Pull Request'); expect(push.id).toMatch(/^sc-push-/)
  })

  it('requires explicit terminal confirmation and never starts a browser process', async () => {
    expect(validateTerminalRequest({ command: 'mapper scan .', cwd: '/tmp', confirmation: TERMINAL_CONFIRMATION }, trust)).toContain('cwd must stay inside a trusted workspace')
    expect(validateTerminalRequest({ command: 'mapper scan .', cwd: '/workspace', env: { API_KEY: 'x' }, confirmation: TERMINAL_CONFIRMATION }, trust).some((error) => error.includes('environment key'))).toBe(true)
    const adapter = new BrowserTerminalAdapter(); const receipt = await adapter.run({ command: 'mapper scan .', cwd: '/workspace', confirmation: TERMINAL_CONFIRMATION }); expect(receipt.mode).toBe('browser-simulated'); expect(receipt.output).toContain('read-only')
  })

  it('validates launch profiles and exposes a confirmation gate', () => {
    const config = { id: 'mapper', name: 'Mapper scan', type: 'mapper' as const, request: { command: 'simplicio-mapper scan .', cwd: '/workspace' } }
    expect(validateLaunchConfiguration(config, trust)).toEqual([]); const session = createRunSession(config, trust); expect(session.state).toBe('awaiting-confirmation'); expect(startRunSession(session, 'no').state).toBe('failed'); expect(startRunSession(session, 'RUN').state).toBe('running')
  })

  it('normalizes settings and searches command palette deterministically', () => {
    expect(normalizePreferences({ version: 99 }).settings).toEqual(DEFAULT_PREFERENCES.settings)
    const run = vi.fn(); const commands = [{ id: 'canvas.open', label: 'Open Canvas', category: 'canvas' as const, run }, { id: 'mapper.scan', label: 'Run Mapper', category: 'mapper' as const, run }]
    expect(searchCommands(commands, 'mapper').map((command) => command.id)).toEqual(['mapper.scan'])
  })
})
