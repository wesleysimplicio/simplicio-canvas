import { describe, expect, it } from 'vitest'
import { createTelemetryEvent, deleteTelemetry, exportTelemetry, recordTelemetry, validateTelemetryProperties } from '../src/domain/telemetry'
import { importRuntimeTrace, runtimeEdges, validateRuntimeTrace } from '../src/domain/runtime-trace'
import { evaluatePolicy, policyToSarif } from '../src/domain/architecture-policy'
import { validateWorkspaceManifest } from '../src/domain/multi-repo'
import { createWorkspaceSnapshot, recoverWorkspace, validateWorkspaceSnapshot } from '../src/domain/workspace-recovery'
import { ONBOARDING_STEPS, nextOnboarding, resetOnboarding, type OnboardingProgress } from '../src/domain/onboarding'
import { dependencySeverity, validateDependencyReport } from '../src/domain/dependency-intelligence'
import { buildArchitectureGraph } from '../src/domain/architecture'

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
  })
})

describe('runtime trace contract', () => {
  it('imports redacted spans and creates distinct runtime edges', () => {
    const value = { schema: 'simplicio-runtime-trace/v1', importedAt: '2025-01-01T00:00:00Z', redacted: true, spans: [{ traceId: 't', spanId: 's', from: 'a', to: 'b', startedAt: '2025-01-01T00:00:00Z', durationMs: 4, count: 2, environment: 'test', attributes: { userEmail: 'never' } }] }
    expect(validateRuntimeTrace(value)).toContain('spans[0] contains forbidden attribute: userEmail')
    const sanitized = { ...value, spans: [{ ...value.spans[0], attributes: undefined }] }
    const trace = importRuntimeTrace(sanitized)
    expect(runtimeEdges(trace)[0].id).toBe('runtime:t:s')
  })
})

describe('architecture policy', () => {
  it('reports layer violations and emits SARIF', () => {
    const graph = buildArchitectureGraph(['presentation/page.ts', 'domain/model.ts', 'tests/model.test.ts'])
    const findings = evaluatePolicy(graph, { version: 1, name: 'layered', allowedLayers: { presentation: ['application'], domain: [] } })
    expect(findings.some((finding) => finding.rule === 'allowed-layers')).toBe(true)
    expect((policyToSarif(findings) as { runs: unknown[] }).runs).toHaveLength(1)
  })
})

describe('multi-repository and recovery contracts', () => {
  it('requires stable revisions and catches unknown edge repositories', () => {
    expect(validateWorkspaceManifest({ version: 1, repositories: [{ id: 'a', name: 'a', root: '.', revision: 'abc', dirty: false, access: 'available' }], edges: [{ id: 'x', fromRepo: 'a', toRepo: 'missing', type: 'api', evidence: [] }] })).toContain('edge references unavailable repository: x')
  })
  it('detects corruption and only restores valid snapshots', () => {
    const graph = { schema: '1.0', project: { id: 'p', name: 'p' }, nodes: [], edges: [], provenance: { source: 'test', generatedAt: 'now' }, evidence: [] } as never
    const snapshot = createWorkspaceSnapshot(graph, {}, 'rev')
    expect(validateWorkspaceSnapshot(snapshot)).toEqual([])
    const corrupt = { ...snapshot, revision: 'changed' }
    expect(recoverWorkspace(corrupt, 'restore').status).toBe('inspect')
    expect(recoverWorkspace(snapshot, 'restore').status).toBe('restore')
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
  })
})
