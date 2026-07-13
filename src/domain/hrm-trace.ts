import type { RuntimeSpan, RuntimeTrace } from './runtime-trace'

// Typed mirror of `simplicio-runtime`'s `simplicio-hrm::PlanOutcome` (see
// wesleysimplicio/simplicio-runtime#3089). This is a pure data contract: no
// planner execution, tool calls or private-state ingestion happen here.
export type HrmStepKind = 'high' | 'low'
export interface HrmStep { kind: HrmStepKind; zH: string; zL: string; index: number; hCycle: number; lCycle: number }
export interface HrmPlanOutcome { log: HrmStep[]; replans: number; microsteps: number; budgetExhausted: boolean }

export interface HrmTraceOptions {
  sourceNodeId: string
  runId?: string
  environment?: string
  baseTimestamp?: string
  /** How much of the raw z_H/z_L state to surface. Defaults to fully redacted. */
  stateExport?: 'none' | 'hash' | 'label'
}

export interface HrmRuntimeTrace extends RuntimeTrace {
  hrm: { sourceNodeId: string; replans: number; microsteps: number; budgetExhausted: boolean; halted: 'cycles' | 'budget' }
}

export interface HrmCorrelation { sourceNodeId: string; matched: boolean; confidence: number; candidates: string[] }

export interface HrmWorkspaceLens {
  background: string[]
  focusedHigh: string | undefined
  activeLow: string[]
  haltReason: 'cycles-complete' | 'budget-exhausted'
}

export function validateHrmPlanOutcome(outcome: unknown): string[] {
  if (!outcome || typeof outcome !== 'object') return ['outcome must be an object']
  const value = outcome as Partial<HrmPlanOutcome>
  const errors: string[] = []
  if (!Array.isArray(value.log)) errors.push('log must be an array')
  for (const [index, step] of (value.log ?? []).entries()) {
    if (step.kind !== 'high' && step.kind !== 'low') errors.push(`log[${index}] kind must be 'high' or 'low'`)
    if (typeof step.zH !== 'string' || typeof step.zL !== 'string') errors.push(`log[${index}] requires zH and zL strings`)
    if (!Number.isInteger(step.index) || !Number.isInteger(step.hCycle) || !Number.isInteger(step.lCycle)) errors.push(`log[${index}] requires integer index, hCycle and lCycle`)
  }
  if (!Number.isInteger(value.replans) || (value.replans as number) < 0) errors.push('replans must be a non-negative integer')
  if (!Number.isInteger(value.microsteps) || (value.microsteps as number) < 0) errors.push('microsteps must be a non-negative integer')
  if (typeof value.budgetExhausted !== 'boolean') errors.push('budgetExhausted must be a boolean')
  return errors
}

function hashState(value: string): string {
  let hash = 5381
  for (let index = 0; index < value.length; index += 1) hash = ((hash * 33) ^ value.charCodeAt(index)) >>> 0
  return hash.toString(16).padStart(8, '0')
}

function labelState(value: string): string { return `${value.length}ch:${value.slice(0, 4)}…` }

function logicalTimestamp(base: string | undefined, offsetMs: number): string {
  const start = base ? Date.parse(base) : 0
  return new Date(start + offsetMs).toISOString()
}

/** Converts a deterministic HRM `PlanOutcome` into the sanitized runtime-trace contract. */
export function hrmOutcomeToRuntimeTrace(outcome: HrmPlanOutcome, options: HrmTraceOptions): HrmRuntimeTrace {
  const errors = validateHrmPlanOutcome(outcome)
  if (errors.length) throw new Error(errors.join('; '))
  const stateExport = options.stateExport ?? 'none'
  const environment = options.environment ?? 'hrm'
  const traceId = options.runId ?? 'hrm-run'
  let activeHighSpanId: string | undefined
  const spans: RuntimeSpan[] = outcome.log.map((step) => {
    const spanId = `${traceId}:${step.index}`
    const attributes: Record<string, string | number | boolean> = { kind: step.kind, h_cycle: step.hCycle, l_cycle: step.lCycle, step_index: step.index }
    if (stateExport === 'hash') { attributes.z_h_hash = hashState(step.zH); attributes.z_l_hash = hashState(step.zL) }
    if (stateExport === 'label') { attributes.z_h_label = labelState(step.zH); attributes.z_l_label = labelState(step.zL) }
    const span: RuntimeSpan = { traceId, spanId, parentSpanId: step.kind === 'low' ? activeHighSpanId : undefined, from: options.sourceNodeId, startedAt: logicalTimestamp(options.baseTimestamp, step.index), durationMs: 0, count: 1, environment, attributes }
    if (step.kind === 'high') activeHighSpanId = spanId
    return span
  })
  if (spans.length) { const last = spans[spans.length - 1]; last.attributes = { ...last.attributes, replans: outcome.replans, microsteps: outcome.microsteps, budget_exhausted: outcome.budgetExhausted } }
  return { schema: 'simplicio-runtime-trace/v1', spans, importedAt: logicalTimestamp(options.baseTimestamp, outcome.log.length), redacted: true, hrm: { sourceNodeId: options.sourceNodeId, replans: outcome.replans, microsteps: outcome.microsteps, budgetExhausted: outcome.budgetExhausted, halted: outcome.budgetExhausted ? 'budget' : 'cycles' } }
}

/** Correlates the HRM trace's static source link against known graph node ids, reporting match uncertainty. */
export function correlateHrmTrace(trace: HrmRuntimeTrace, staticNodeIds: string[]): HrmCorrelation {
  const sourceNodeId = trace.hrm.sourceNodeId
  if (staticNodeIds.includes(sourceNodeId)) return { sourceNodeId, matched: true, confidence: 1, candidates: [sourceNodeId] }
  const candidates = staticNodeIds.filter((id) => /hrm|planner/i.test(id))
  return { sourceNodeId, matched: false, confidence: candidates.length ? 1 / candidates.length : 0, candidates }
}

/** Bounded workspace lens: full history in the background, one focused high cycle, its active low microsteps highlighted. */
export function hrmWorkspaceLens(trace: HrmRuntimeTrace, focusedHCycle?: number): HrmWorkspaceLens {
  const background = trace.spans.map((span) => span.spanId)
  const highSpans = trace.spans.filter((span) => span.attributes?.kind === 'high')
  const lastHCycle = highSpans.length ? Number(highSpans[highSpans.length - 1].attributes?.h_cycle) : 0
  const targetCycle = focusedHCycle ?? lastHCycle
  const focused = trace.spans.find((span) => span.attributes?.kind === 'high' && span.attributes?.h_cycle === targetCycle)
  const activeLow = trace.spans.filter((span) => span.attributes?.kind === 'low' && span.attributes?.h_cycle === targetCycle).map((span) => span.spanId)
  return { background, focusedHigh: focused?.spanId, activeLow, haltReason: trace.hrm.budgetExhausted ? 'budget-exhausted' : 'cycles-complete' }
}

/** Deterministic synthetic fixture mirroring simplicio-runtime's `HrmConfig::new(2, 3)` unit test. */
export const SIMPLICIO_HRM_FIXTURE: HrmPlanOutcome = {
  log: [
    { kind: 'high', zH: 'h0+', zL: 'l0', index: 0, hCycle: 0, lCycle: 0 },
    { kind: 'low', zH: 'h0+', zL: 'l0.', index: 1, hCycle: 0, lCycle: 1 },
    { kind: 'low', zH: 'h0+', zL: 'l0..', index: 2, hCycle: 0, lCycle: 2 },
    { kind: 'low', zH: 'h0+', zL: 'l0...', index: 3, hCycle: 0, lCycle: 3 },
    { kind: 'high', zH: 'h0++', zL: 'l0...', index: 4, hCycle: 1, lCycle: 0 },
    { kind: 'low', zH: 'h0++', zL: 'l0....', index: 5, hCycle: 1, lCycle: 1 },
    { kind: 'low', zH: 'h0++', zL: 'l0.....', index: 6, hCycle: 1, lCycle: 2 },
    { kind: 'low', zH: 'h0++', zL: 'l0......', index: 7, hCycle: 1, lCycle: 3 },
  ],
  replans: 2,
  microsteps: 6,
  budgetExhausted: false,
}
