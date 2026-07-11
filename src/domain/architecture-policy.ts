import type { ArchitectureGraph } from './architecture'
export type PolicySeverity = 'info' | 'warning' | 'error'
export interface ArchitecturePolicy { version: 1; name: string; allowedLayers?: Record<string, string[]>; forbiddenCycles?: boolean; ownership?: Record<string, string> }
export interface PolicyFinding { id: string; rule: string; severity: PolicySeverity; nodeIds: string[]; message: string; evidence: string[]; suppressed?: boolean }
export function evaluatePolicy(graph: ArchitectureGraph, policy: ArchitecturePolicy): PolicyFinding[] {
  const findings: PolicyFinding[] = []
  for (const edge of graph.edges) {
    const from = graph.nodes.find((node) => node.id === edge.from); const to = graph.nodes.find((node) => node.id === edge.to)
    if (!from || !to || !policy.allowedLayers) continue
    const allowed = policy.allowedLayers[from.layer] ?? []
    if (allowed.length && !allowed.includes(to.layer)) findings.push({ id: `layer:${edge.from}:${edge.to}`, rule: 'allowed-layers', severity: 'error', nodeIds: [edge.from, edge.to], message: `${from.layer} cannot depend on ${to.layer}`, evidence: [from.path, to.path] })
  }
  if (policy.forbiddenCycles) {
    for (const node of graph.nodes) if (graph.edges.some((edge) => edge.from === node.id && edge.to === node.id)) findings.push({ id: `cycle:${node.id}`, rule: 'forbidden-cycles', severity: 'error', nodeIds: [node.id], message: `Self-cycle detected at ${node.name}`, evidence: [node.path] })
  }
  return findings
}
export function policyToSarif(findings: PolicyFinding[]): object { return { version: '2.1.0', runs: [{ tool: { driver: { name: 'simplicio-canvas-policy' } }, results: findings.filter((f) => !f.suppressed).map((f) => ({ ruleId: f.rule, level: f.severity === 'error' ? 'error' : f.severity === 'warning' ? 'warning' : 'note', message: { text: f.message }, locations: f.evidence.map((uri) => ({ physicalLocation: { artifactLocation: { uri } } })) })) }] } }
