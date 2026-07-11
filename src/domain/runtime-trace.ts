import type { GraphEdge } from './graph-schema'

export interface RuntimeSpan { traceId: string; spanId: string; parentSpanId?: string; from: string; to?: string; startedAt: string; durationMs: number; count: number; environment: string; attributes?: Record<string, string | number | boolean> }
export interface RuntimeTrace { schema: 'simplicio-runtime-trace/v1'; spans: RuntimeSpan[]; importedAt: string; redacted: true }
export interface RuntimeCorrelation { runtimeEdges: GraphEdge[]; matched: string[]; unexpected: string[]; unusedStatic: string[]; confidence: number }
const forbidden = /(?:user|email|authorization|cookie|token|secret|password|body|content|path|url)/i
export function validateRuntimeTrace(trace: unknown): string[] {
  if (!trace || typeof trace !== 'object') return ['trace must be an object']
  const value = trace as Partial<RuntimeTrace>
  const errors: string[] = []
  if (value.schema !== 'simplicio-runtime-trace/v1') errors.push('unsupported runtime trace schema')
  if (!Array.isArray(value.spans)) errors.push('spans must be an array')
  for (const [index, span] of (value.spans ?? []).entries()) {
    if (!span.traceId || !span.spanId || !span.from) errors.push(`spans[${index}] requires traceId, spanId and from`)
    if (!Number.isFinite(span.durationMs) || span.durationMs < 0) errors.push(`spans[${index}] durationMs must be non-negative`)
    for (const key of Object.keys(span.attributes ?? {})) if (forbidden.test(key)) errors.push(`spans[${index}] contains forbidden attribute: ${key}`)
  }
  return errors
}
export function importRuntimeTrace(value: unknown): RuntimeTrace {
  const errors = validateRuntimeTrace(value); if (errors.length) throw new Error(errors.join('; '))
  const trace = value as RuntimeTrace
  return { schema: trace.schema, spans: trace.spans.map((span) => ({ ...span, attributes: undefined })), importedAt: trace.importedAt, redacted: true }
}
export function runtimeEdges(trace: RuntimeTrace): GraphEdge[] {
  return trace.spans.filter((span): span is RuntimeSpan & { to: string } => Boolean(span.to)).map((span) => ({ id: `runtime:${span.traceId}:${span.spanId}`, from: span.from, to: span.to, type: 'call', label: `${span.count}× · ${span.durationMs}ms` }))
}
export function correlateRuntimeTrace(staticEdges: Array<{ from: string; to: string }>, trace: RuntimeTrace): RuntimeCorrelation {
  const runtime = runtimeEdges(trace); const staticKeys = new Set(staticEdges.map((edge) => `${edge.from}\0${edge.to}`)); const runtimeKeys = new Set(runtime.map((edge) => `${edge.from}\0${edge.to}`))
  const matched = [...runtimeKeys].filter((key) => staticKeys.has(key)); const unexpected = [...runtimeKeys].filter((key) => !staticKeys.has(key)); const unusedStatic = [...staticKeys].filter((key) => !runtimeKeys.has(key)); const confidence = runtime.length ? matched.length / runtimeKeys.size : 1
  return { runtimeEdges: runtime, matched, unexpected, unusedStatic, confidence }
}
