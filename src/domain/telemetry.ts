/** Privacy-preserving, opt-in product diagnostics. Source and identity data never belong in events. */
export type TelemetryConsent = 'unknown' | 'denied' | 'granted'
export type TelemetryName = 'app_opened' | 'scan_completed' | 'interaction_latency' | 'render_completed' | 'error'
export interface TelemetryEvent { id: string; name: TelemetryName; at: string; schema: 1; properties: Record<string, string | number | boolean> }
export interface TelemetryStore { consent: TelemetryConsent; events: readonly TelemetryEvent[] }
export interface SloSample { loadMs?: number; scanMs?: number; interactionMs?: number; frameMs?: number }
export interface SloReport { schema: 'simplicio-slo/v1'; measuredAt: string; sample: SloSample; budgets: Required<SloSample>; status: Record<keyof Required<SloSample>, 'ok' | 'breach'> }
export const DEFAULT_SLO_BUDGETS: Required<SloSample> = { loadMs: 3000, scanMs: 10000, interactionMs: 100, frameMs: 16.7 }

const FORBIDDEN = /(?:source|body|content|path|url|repo|repository|prompt|secret|token|password|api[_-]?key|private[_-]?key)/i
export function validateTelemetryProperties(properties: Record<string, unknown>): string[] {
  return Object.keys(properties).filter((key) => FORBIDDEN.test(key)).map((key) => `forbidden telemetry field: ${key}`)
}
export function createTelemetryEvent(name: TelemetryName, properties: Record<string, string | number | boolean>, at = new Date().toISOString()): TelemetryEvent {
  const errors = validateTelemetryProperties(properties)
  if (errors.length) throw new Error(errors.join('; '))
  return { id: `telemetry-${at}-${Math.random().toString(36).slice(2, 8)}`, name, at, schema: 1, properties: { ...properties } }
}
export function recordTelemetry(store: TelemetryStore, event: TelemetryEvent): TelemetryStore {
  if (store.consent !== 'granted') return { ...store, events: [...store.events] }
  if (validateTelemetryProperties(event.properties).length) throw new Error('Telemetry event contains forbidden data')
  return { ...store, events: [...store.events, structuredClone(event)] }
}
export function exportTelemetry(store: TelemetryStore): string { return JSON.stringify({ schema: 1, consent: store.consent, events: store.events }, null, 2) }
export function deleteTelemetry(store: TelemetryStore): TelemetryStore { return { ...store, events: [] } }
export function evaluateSlo(sample: SloSample, budgets: Required<SloSample> = DEFAULT_SLO_BUDGETS, measuredAt = new Date().toISOString()): SloReport {
  const keys = Object.keys(budgets) as Array<keyof Required<SloSample>>
  const status = Object.fromEntries(keys.map((key) => [key, sample[key] === undefined || sample[key]! <= budgets[key] ? 'ok' : 'breach'])) as SloReport['status']
  return { schema: 'simplicio-slo/v1', measuredAt, sample: { ...sample }, budgets: { ...budgets }, status }
}
export function exportSloReport(report: SloReport): string { return JSON.stringify(report, null, 2) }
