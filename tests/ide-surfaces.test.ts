import { describe, expect, it, vi } from 'vitest'
import { buildArchitectureGraph } from '../src/domain/architecture'
import { buildExplorerTree, closeEditorTab, createEditorState, openEditorFile, updateEditorContent, canCloseEditorTab, validateWorkspaceMutation } from '../src/domain/editor-workspace'
import { proposeEdgeConnection, proposeEdgeReconnection, proposeEdgeReversal } from '../src/domain/edge-refactor'
import { PreferencesStore, searchCommands, normalizePreferences, DEFAULT_PREFERENCES } from '../src/domain/workspace-preferences'
import { createReadOnlySourceControlAdapter, createSourceControlController, validateSourceControlAction, shouldRequirePullRequest, type SourceControlSnapshot } from '../src/domain/source-control'
import { BrowserTerminalAdapter, GuardedProcessAdapter, TERMINAL_CONFIRMATION, validateTerminalRequest } from '../src/domain/terminal-adapter'
import { LazyEditorHost } from '../src/domain/lazy-editor'
import { IncrementalEditorController, findInEditor, syntaxDiagnostics } from '../src/domain/editor-services'
import { WorkspaceCrudController } from '../src/domain/workspace-crud'
import { boundRunOutput, createRunSession, finishRunSession, restartRunSession, startRunSession, stopRunSession, validateLaunchConfiguration } from '../src/domain/run-debug'

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
    expect(proposeEdgeReconnection({ ...graph, edges: [edge] }, edge, { from: a, to: b, type: 'depends' })).toMatchObject({ kind: 'reconnect', readonly: true })
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

  it('streams a bounded host process through workspace and abort boundaries', async () => {
    let seenSignal: AbortSignal | undefined
    const adapter = new GuardedProcessAdapter(trust, async (request, onChunk, signal) => { seenSignal = signal; onChunk('x'.repeat(120_000)); return request.command.includes('ok') ? 0 : 1 })
    const receipt = await adapter.run({ command: 'ok', cwd: '/workspace', confirmation: TERMINAL_CONFIRMATION }); expect(receipt.mode).toBe('local-pty'); expect(receipt.exitCode).toBe(0); expect(receipt.output.length).toBe(100_000); expect(seenSignal?.aborted).toBe(false)
    await expect(adapter.run({ command: 'ok', cwd: '/tmp', confirmation: TERMINAL_CONFIRMATION })).rejects.toThrow('trusted workspace')
  })

  it('loads the editor engine lazily once and reveals requested locations', async () => {
    let loads = 0; let value = ''; let location = ''; let disposed = false
    const host = new LazyEditorHost(async () => { loads += 1; return { setValue: (next: string) => { value = next }, getValue: () => value, reveal: (line, column) => { location = `${line}:${column}` }, dispose: () => { disposed = true } } })
    const first = await host.open('one', 0, 0); const second = await host.open('two', 4, 7); expect(first).toBe(second); expect(loads).toBe(1); expect(value).toBe('two'); expect(location).toBe('4:7'); expect(host.getState().status).toBe('ready'); host.dispose(); expect(disposed).toBe(true)
  })

  it('provides diagnostics, find matches and incremental reparse with dirty-close protection', async () => {
    expect(syntaxDiagnostics('function run() {\n return (1\n}', 'TypeScript').map((item) => item.severity)).toContain('error')
    expect(findInEditor('Task task\ntask', 'task', { wholeWord: true }).map((match) => `${match.line}:${match.column}`)).toEqual(['1:1', '1:6', '2:1'])
    const reparsed: string[] = []; const controller = new IncrementalEditorController({ tabs: [] }, async (path, content) => { reparsed.push(path); return { path, content, diagnostics: syntaxDiagnostics(content, 'TypeScript'), changedPaths: [path] } })
    const tab = controller.open({ path: 'src/a.ts', content: 'const a = 1', language: 'TypeScript' }); controller.update(tab.id, 'const a = (1'); expect(controller.close(tab.id)).toBe(false); const result = await controller.save(tab.id); expect(result.changedPaths).toEqual(['src/a.ts']); expect(reparsed).toEqual(['src/a.ts']); expect(controller.getState().tabs[0].dirty).toBe(false); expect(controller.close(tab.id)).toBe(true)
  })

  it('validates launch profiles and exposes a confirmation gate', () => {
    const config = { id: 'mapper', name: 'Mapper scan', type: 'mapper' as const, request: { command: 'simplicio-mapper scan .', cwd: '/workspace' } }
    expect(validateLaunchConfiguration(config, trust)).toEqual([]); const session = createRunSession(config, trust); expect(session.state).toBe('awaiting-confirmation'); expect(startRunSession(session, 'no').state).toBe('failed'); expect(startRunSession(session, 'RUN').state).toBe('running')
  })

  it('supports guarded run lifecycle with bounded output and restart', () => {
    const config = { id: 'mapper', name: 'Mapper scan', type: 'mapper' as const, request: { command: 'simplicio-mapper scan .', cwd: '/workspace' } }
    let session = createRunSession(config, trust); session = startRunSession(session, 'RUN'); expect(session.state).toBe('running'); expect(startRunSession(session, 'RUN').errors.at(-1)).toContain('already active')
    const receipt = { id: 'run-1', command: config.request.command, cwd: config.request.cwd, exitCode: 0, output: 'x'.repeat(120_000), startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z', mode: 'browser-simulated' as const }
    session = finishRunSession(session, receipt); expect(session.state).toBe('stopped'); expect(session.receipt?.output.length).toBeLessThan(100_000); expect(boundRunOutput('ok')).toBe('ok'); expect(stopRunSession(session).errors.at(-1)).toContain('not active'); expect(restartRunSession(session, 'RUN').state).toBe('running')
  })

  it('normalizes settings and searches command palette deterministically', () => {
    expect(normalizePreferences({ version: 99 }).settings).toEqual(DEFAULT_PREFERENCES.settings)
    const run = vi.fn(); const commands = [{ id: 'canvas.open', label: 'Open Canvas', category: 'canvas' as const, run }, { id: 'mapper.scan', label: 'Run Mapper', category: 'mapper' as const, run }]
    expect(searchCommands(commands, 'mapper').map((command) => command.id)).toEqual(['mapper.scan'])
  })

  it('persists preferences and rejects conflicting remappable shortcuts', () => {
    const data = new Map<string, string>(); const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, removeItem: (key: string) => { data.delete(key) } }
    const store = new PreferencesStore(storage); expect(store.setShortcut('canvas.open', 'Ctrl+Shift+O').shortcuts['canvas.open']).toBe('ctrl+shift+o'); expect(() => store.setShortcut('canvas.search', 'ctrl+shift+o')).toThrow('conflicts'); const exported = store.export(); store.reset(); expect(store.get().shortcuts['canvas.open']).toBe(DEFAULT_PREFERENCES.shortcuts['canvas.open']); expect(store.import(exported).shortcuts['canvas.open']).toBe('ctrl+shift+o')
  })

  it('gates Explorer CRUD by trust/path and supports undo receipts', async () => {
    const calls: string[] = []; const adapter = { create: async (path: string) => { calls.push(`create:${path}`) }, rename: async (path: string, next: string) => { calls.push(`rename:${path}->${next}`) }, delete: async (path: string) => { calls.push(`delete:${path}`) } }
    const controller = new WorkspaceCrudController(trust, adapter); expect((await controller.create('src/new.ts', 'export {}')).accepted).toBe(true); expect(calls[0]).toBe('create:/workspace/src/new.ts'); expect((await controller.undo()).accepted).toBe(true); expect(calls[1]).toBe('delete:/workspace/src/new.ts'); expect((await controller.rename('../secret.ts', 'src/x.ts')).accepted).toBe(false); expect((await new WorkspaceCrudController({ trusted: false, root: '/workspace' }, adapter).create('src/x.ts')).detail).toContain('trust')
  })
})
