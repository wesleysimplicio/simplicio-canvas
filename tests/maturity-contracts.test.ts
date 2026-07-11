import { describe, expect, it } from 'vitest'
import { createTelemetryEvent, deleteTelemetry, evaluateSlo, exportSloReport, exportTelemetry, recordTelemetry, validateTelemetryProperties } from '../src/domain/telemetry'
import { correlateRuntimeTrace, importRuntimeTrace, runtimeEdges, validateRuntimeTrace } from '../src/domain/runtime-trace'
import { applyPolicyBaseline, createPolicyBaseline, evaluatePolicy, newPolicyFindings, parsePolicyBaseline, policyToSarif } from '../src/domain/architecture-policy'
import { SIMPLICIO_LANDSCAPE_FIXTURE, summarizeWorkspaceLandscape, validateWorkspaceManifest } from '../src/domain/multi-repo'
import { createWorkspaceSnapshot, recoverWorkspace, validateWorkspaceSnapshot } from '../src/domain/workspace-recovery'
import { ONBOARDING_STEPS, nextOnboarding, resetOnboarding, type OnboardingProgress } from '../src/domain/onboarding'
import { analyzeDependencies, dependencySeverity, enrichDependencyReport, validateDependencyReport } from '../src/domain/dependency-intelligence'
import { buildArchitectureGraph } from '../src/domain/architecture'
import { createCacheKey, inspectWorkspaceCache, LocalStorageCacheAdapter, MemoryCacheAdapter, repairWorkspaceCache, saveWorkspaceCache } from '../src/domain/workspace-cache'
import { diffGraphs, replayGraphDiff, serializeGraphDiff } from '../src/domain/graph-diff'

describe('privacy-preserving telemetry', () => {
  it('rejects source and identity fields and is consent gated', () => {
    expect(validateTelemetryProperties({ sourceBody: 'x' })).toHaveLength(1)
    const event = createTelemetryEvent('app_opened', { nodes: 3 })
    const denied = recordTelemetry({ consent: 'denied', events: [] }, event)
    expect(denied.events).toHaveLength(0)
    const granted = recordTelemetry({ consent: 'granted', events: [] }, event)
    expect(granted.events).toHaveLength(1)
    expect(JSON.parse(exportTelemetry(granted)).events).toHaveLength(1)
    expect(deleteTelemetry(granted).events).toHaveLength(0)
    const slo = evaluateSlo({ scanMs: 12, interactionMs: 120 }, { loadMs: 3000, scanMs: 10000, interactionMs: 100, frameMs: 16.7 }, 'now')
    expect(slo.status.scanMs).toBe('ok'); expect(slo.status.interactionMs).toBe('breach'); expect(JSON.parse(exportSloReport(slo)).schema).toBe('simplicio-slo/v1')
  })
})

describe('runtime trace contract', () => {
  it('imports redacted spans and creates distinct runtime edges', () => {
    const value = { schema: 'simplicio-runtime-trace/v1', importedAt: '2025-01-01T00:00:00Z', redacted: true, spans: [{ traceId: 't', spanId: 's', from: 'a', to: 'b', startedAt: '2025-01-01T00:00:00Z', durationMs: 4, count: 2, environment: 'test', attributes: { userEmail: 'never' } }] }
    expect(validateRuntimeTrace(value)).toContain('spans[0] contains forbidden attribute: userEmail')
    const sanitized = { ...value, spans: [{ ...value.spans[0], attributes: undefined }] }
    const trace = importRuntimeTrace(sanitized)
    expect(runtimeEdges(trace)[0].id).toBe('runtime:t:s')
    const correlation = correlateRuntimeTrace([{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }], trace)
    expect(correlation.matched).toEqual(['a\u0000b']); expect(correlation.unusedStatic).toEqual(['b\u0000c']); expect(correlation.unexpected).toEqual([]); expect(correlation.confidence).toBe(1)
  })
})

describe('architecture policy', () => {
  it('reports layer violations and emits SARIF', () => {
    const graph = buildArchitectureGraph(['presentation/page.ts', 'domain/model.ts', 'tests/model.test.ts'])
    const findings = evaluatePolicy(graph, { version: 1, name: 'layered', allowedLayers: { presentation: ['application'], domain: [] } })
    expect(findings.some((finding) => finding.rule === 'allowed-layers')).toBe(true)
    expect((policyToSarif(findings) as { runs: unknown[] }).runs).toHaveLength(1)
    const baseline = createPolicyBaseline({ version: 1, name: 'layered' }, findings, 'now'); const suppressed = applyPolicyBaseline(findings, baseline)
    expect(suppressed.every((finding) => finding.suppressed)).toBe(true); expect(newPolicyFindings(findings, baseline)).toHaveLength(0); expect(parsePolicyBaseline(JSON.parse(JSON.stringify(baseline))).findingIds).toEqual(baseline.findingIds)
  })
})
describe('graph revision diff', () => {
  it('classifies deterministic node/edge changes and exports evidence', () => {
    const base = { schema: '1.0', project: { id: 'p', name: 'p' }, nodes: [{ id: 'n1', kind: 'file', name: 'a' }], edges: [], provenance: { source: 'git', generatedAt: 'r1', snapshot: 'r1' }, evidence: [] } as any
    const next = { ...base, nodes: [...base.nodes, { id: 'n2', kind: 'file', name: 'b' }], provenance: { ...base.provenance, generatedAt: 'r2', snapshot: 'r2' } }
    const diff = diffGraphs(base, next); expect(diff.changes).toMatchObject([{ kind: 'added', entity: 'node', id: 'n2' }]); expect(replayGraphDiff(base, diff, 1).nodes).toHaveLength(2); expect(JSON.parse(serializeGraphDiff(diff)).schema).toBe('simplicio-graph-diff/v1')
  })
})

describe('multi-repository and recovery contracts', () => {
  it('requires stable revisions and catches unknown edge repositories', () => {
    expect(validateWorkspaceManifest({ version: 1, repositories: [{ id: 'a', name: 'a', root: '.', revision: 'abc', dirty: false, access: 'available' }], edges: [{ id: 'x', fromRepo: 'a', toRepo: 'missing', type: 'api', evidence: [] }] })).toContain('edge references unavailable repository: x')
    expect(validateWorkspaceManifest(SIMPLICIO_LANDSCAPE_FIXTURE)).toEqual([]); const landscape = summarizeWorkspaceLandscape(SIMPLICIO_LANDSCAPE_FIXTURE); expect(landscape.repositories).toHaveLength(4); expect(landscape.available).toBe(2); expect(landscape.unavailable).toBe(2); expect(landscape.edges).toHaveLength(3)
  })
  it('detects corruption and only restores valid snapshots', () => {
    const graph = { schema: '1.0', project: { id: 'p', name: 'p' }, nodes: [], edges: [], provenance: { source: 'test', generatedAt: 'now' }, evidence: [] } as never
    const snapshot = createWorkspaceSnapshot(graph, {}, 'rev')
    expect(validateWorkspaceSnapshot(snapshot)).toEqual([])
    const corrupt = { ...snapshot, revision: 'changed' }
    expect(recoverWorkspace(corrupt, 'restore').status).toBe('inspect')
    expect(recoverWorkspace(snapshot, 'restore').status).toBe('restore')
    const adapter = new MemoryCacheAdapter(); const key = saveWorkspaceCache(adapter, { repository: 'loop', revision: 'rev', configuration: 'default' }, snapshot, 'now')
    expect(createCacheKey({ repository: 'loop', revision: 'rev', configuration: 'default' })).toBe(key)
    expect(inspectWorkspaceCache(adapter, key, 'rev').status).toBe('valid')
    expect(inspectWorkspaceCache(adapter, key, 'other').status).toBe('stale-revision')
    adapter.failNextWrite = true; expect(() => saveWorkspaceCache(adapter, { repository: 'loop', revision: 'next', configuration: 'default' }, snapshot)).toThrow(/interrupted/)
    const raw = adapter.read(key)!; adapter.writeAtomic(key, raw.slice(0, 12)); expect(inspectWorkspaceCache(adapter, key).status).toBe('corrupt')
    expect(repairWorkspaceCache(adapter, key).status).toBe('corrupt'); expect(inspectWorkspaceCache(adapter, key).status).toBe('missing')
    const values = new Map<string, string>(); const storage = { getItem: (item: string) => values.get(item) ?? null, setItem: (item: string, value: string) => values.set(item, value), removeItem: (item: string) => values.delete(item) }
    const local = new LocalStorageCacheAdapter(storage); const localKey = saveWorkspaceCache(local, { repository: 'loop', revision: 'rev', configuration: 'default' }, snapshot, 'now'); expect(inspectWorkspaceCache(local, localKey).status).toBe('valid')
  })
})

describe('onboarding and dependency contracts', () => {
  it('progresses and resets the guided tour', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4)
    let progress: OnboardingProgress = { ...resetOnboarding(), state: 'active' }
    for (let i = 0; i < ONBOARDING_STEPS.length; i += 1) progress = nextOnboarding(progress)
    expect(progress.state).toBe('completed')
  })
  it('classifies dependency risk and validates offline reports', () => {
    expect(dependencySeverity({ name: 'x', scope: 'direct', manifest: 'package.json', vulnerabilityIds: ['CVE'] })).toBe('critical')
    expect(validateDependencyReport({ schema: 'simplicio-dependencies/v1', generatedAt: 'now', offline: true, dependencies: [{ name: 'x', scope: 'direct', manifest: 'package.json' }] })).toEqual([])
    const report = analyzeDependencies([{ path: 'package.json', content: '{"dependencies":{"three":"^0.178.0"},"devDependencies":{"vitest":"^3"}}' }, { path: 'package-lock.json', content: '\n  "node_modules/lodash": {}' }, { path: 'pyproject.toml', content: 'dependencies = [\n  "httpx>=1",\n  "pydantic"\n]' }], 'now')
    expect(report.offline).toBe(true)
    expect(report.dependencies.map((item) => item.name)).toEqual(expect.arrayContaining(['three', 'vitest', 'lodash', 'httpx', 'pydantic']))
    const enriched = enrichDependencyReport(report, [{ path: 'bom.cdx.json', content: '{"components":[{"name":"three","licenses":[{"license":{"id":"MIT"}}]}]}' }, { path: 'audit.json', content: '{"vulnerabilities":{"three":{"via":[{"id":"CVE-TEST"}]}}}' }, { path: '.github/CODEOWNERS', content: '* @team-security' }])
    expect(enriched.dependencies.find((item) => item.name === 'three')).toMatchObject({ license: 'MIT', vulnerabilityIds: ['CVE-TEST'], owners: ['@team-security'] })
    expect(enriched.sources).toEqual(expect.arrayContaining(['bom.cdx.json', 'audit.json']))
    expect(dependencySeverity(enriched.dependencies.find((item) => item.name === 'three')!)).toBe('critical')
  })
})
