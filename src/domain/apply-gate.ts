import type { ChangePlan } from './change-plan'

export interface FileDiff { path: string; before: string; after: string }
export interface ApplyReceipt { id: string; createdAt: string; files: string[]; tests: string[]; accepted: boolean; checkpointId?: string }
export interface ApplyRequest { plan: ChangePlan; diffs: FileDiff[]; confirmation: string }
export const CONFIRM_APPLY = 'APPLY'

export function validateDiff(plan: ChangePlan, diffs: FileDiff[]): string[] {
  const errors: string[] = []; const expected = new Set(plan.files)
  for (const diff of diffs) { if (!expected.has(diff.path)) errors.push(`Unexpected file in diff: ${diff.path}`); if (diff.before === diff.after) errors.push(`Empty diff: ${diff.path}`) }
  for (const file of plan.files) if (!diffs.some((diff) => diff.path === file)) errors.push(`Missing diff: ${file}`)
  return errors
}

export function previewApply(request: ApplyRequest): { allowed: boolean; errors: string[]; diffs: FileDiff[] } {
  const errors = validateDiff(request.plan, request.diffs)
  if (request.confirmation !== CONFIRM_APPLY) errors.push(`Explicit confirmation required: type ${CONFIRM_APPLY}`)
  return { allowed: errors.length === 0, errors, diffs: request.diffs.map((diff) => ({ ...diff })) }
}

export function createApplyReceipt(plan: ChangePlan, accepted: boolean, checkpointId?: string, now = new Date()): ApplyReceipt {
  return { id: `apply-${now.toISOString()}-${plan.files.length}`, createdAt: now.toISOString(), files: [...plan.files], tests: [...plan.tests], accepted, ...(checkpointId ? { checkpointId } : {}) }
}
