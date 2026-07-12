import { describe, expect, it } from 'vitest'
import { validateRuntimeTrace } from '../src/domain/runtime-trace'
import { SIMPLICIO_HRM_FIXTURE, correlateHrmTrace, hrmOutcomeToRuntimeTrace, hrmWorkspaceLens, validateHrmPlanOutcome } from '../src/domain/hrm-trace'

describe('HRM plan outcome adapter', () => {
  it('accepts the deterministic fixture and rejects malformed outcomes', () => {
    expect(validateHrmPlanOutcome(SIMPLICIO_HRM_FIXTURE)).toEqual([])
    expect(validateHrmPlanOutcome({ log: [{ kind: 'mid', zH: 'a', zL: 'b', index: 0, hCycle: 0, lCycle: 0 }], replans: 1, microsteps: 0, budgetExhausted: false })).toContain("log[0] kind must be 'high' or 'low'")
    expect(validateHrmPlanOutcome({})).toContain('log must be an array')
  })

  it('produces a schema-valid runtime trace with nested parent/child spans and redacted state', () => {
    const trace = hrmOutcomeToRuntimeTrace(SIMPLICIO_HRM_FIXTURE, { sourceNodeId: 'planner:hrm', runId: 'run-1', baseTimestamp: '2026-01-01T00:00:00.000Z' })
    expect(validateRuntimeTrace(trace)).toEqual([])
    expect(trace.spans).toHaveLength(8)
    expect(trace.spans.every((span) => span.from === 'planner:hrm')).toBe(true)
    expect(trace.spans.every((span) => !('z_h' in (span.attributes ?? {})) && !('z_l' in (span.attributes ?? {})))).toBe(true)

    const highSpans = trace.spans.filter((span) => span.attributes?.kind === 'high')
    expect(highSpans).toHaveLength(2)
    const lowSpansForFirstCycle = trace.spans.filter((span) => span.attributes?.kind === 'low' && span.attributes?.h_cycle === 0)
    expect(lowSpansForFirstCycle.every((span) => span.parentSpanId === highSpans[0].spanId)).toBe(true)
    const lowSpansForSecondCycle = trace.spans.filter((span) => span.attributes?.kind === 'low' && span.attributes?.h_cycle === 1)
    expect(lowSpansForSecondCycle.every((span) => span.parentSpanId === highSpans[1].spanId)).toBe(true)

    const last = trace.spans[trace.spans.length - 1]
    expect(last.attributes).toMatchObject({ replans: 2, microsteps: 6, budget_exhausted: false })
    expect(trace.hrm).toMatchObject({ sourceNodeId: 'planner:hrm', replans: 2, microsteps: 6, budgetExhausted: false, halted: 'cycles' })
  })

  it('optionally exposes hashed or label-only state without leaking raw text', () => {
    const hashed = hrmOutcomeToRuntimeTrace(SIMPLICIO_HRM_FIXTURE, { sourceNodeId: 'planner:hrm', stateExport: 'hash' })
    expect(hashed.spans[0].attributes?.z_h_hash).toMatch(/^[0-9a-f]{8}$/)
    const labeled = hrmOutcomeToRuntimeTrace(SIMPLICIO_HRM_FIXTURE, { sourceNodeId: 'planner:hrm', stateExport: 'label' })
    expect(labeled.spans[0].attributes?.z_h_label).toBe('3ch:h0+…')
  })

  it('marks budget-exhausted runs distinctly from normal completion', () => {
    const budgetBound = hrmOutcomeToRuntimeTrace({ ...SIMPLICIO_HRM_FIXTURE, budgetExhausted: true }, { sourceNodeId: 'planner:hrm' })
    expect(budgetBound.hrm.halted).toBe('budget')
    const lens = hrmWorkspaceLens(budgetBound)
    expect(lens.haltReason).toBe('budget-exhausted')
  })

  it('correlates the source node against static ids with uncertainty when unmatched', () => {
    const trace = hrmOutcomeToRuntimeTrace(SIMPLICIO_HRM_FIXTURE, { sourceNodeId: 'planner:hrm' })
    expect(correlateHrmTrace(trace, ['planner:hrm', 'other'])).toMatchObject({ matched: true, confidence: 1 })
    const uncertain = correlateHrmTrace(trace, ['nodes/hrm-planner.rs', 'nodes/unrelated.ts'])
    expect(uncertain.matched).toBe(false)
    expect(uncertain.candidates).toEqual(['nodes/hrm-planner.rs'])
    expect(uncertain.confidence).toBe(1)
    expect(correlateHrmTrace(trace, ['nothing-here']).confidence).toBe(0)
  })

  it('builds a bounded workspace lens: full history, one focused high cycle, its active low steps', () => {
    const trace = hrmOutcomeToRuntimeTrace(SIMPLICIO_HRM_FIXTURE, { sourceNodeId: 'planner:hrm', runId: 'run-1' })
    const lens = hrmWorkspaceLens(trace, 0)
    expect(lens.background).toHaveLength(8)
    expect(lens.focusedHigh).toBe('run-1:0')
    expect(lens.activeLow).toEqual(['run-1:1', 'run-1:2', 'run-1:3'])
    const latest = hrmWorkspaceLens(trace)
    expect(latest.focusedHigh).toBe('run-1:4')
    expect(latest.activeLow).toEqual(['run-1:5', 'run-1:6', 'run-1:7'])
  })
})
