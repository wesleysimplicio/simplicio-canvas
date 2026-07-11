import type { ArchitectureGraph } from './architecture'

export type VisualOperation = { kind: 'create' | 'delete' | 'move' | 'rename' | 'connect'; target: string; details: Record<string, string> }
export interface IntentRequest { id: string; text: string; graphVersion: string; createdAt: string }
export interface ProposalRisk { level: 'low' | 'medium' | 'high'; message: string }
export interface IntentProposal { request: IntentRequest; assumptions: string[]; operations: VisualOperation[]; risks: ProposalRisk[]; evidence: string[]; provider: string }
export interface ProposalValidation { valid: boolean; errors: string[] }
export interface AiProvider { readonly id: string; propose(request: IntentRequest, graph: ArchitectureGraph): Promise<IntentProposal> }

export function validateProposal(proposal: IntentProposal): ProposalValidation {
  const errors: string[] = []
  if (!proposal.request?.id || !proposal.request.text) errors.push('request must include id and text')
  if (!proposal.provider) errors.push('provider is required')
  if (!Array.isArray(proposal.operations)) errors.push('operations must be an array')
  for (const [index, operation] of (proposal.operations ?? []).entries()) {
    if (!['create', 'delete', 'move', 'rename', 'connect'].includes(operation.kind)) errors.push(`operations[${index}].kind is unsupported`)
    if (!operation.target) errors.push(`operations[${index}].target is required`)
  }
  return { valid: errors.length === 0, errors }
}

export function previewProposal(proposal: IntentProposal): Readonly<IntentProposal> {
  const result = validateProposal(proposal)
  if (!result.valid) throw new Error(`Invalid proposal: ${result.errors.join('; ')}`)
  return structuredClone(proposal)
}
