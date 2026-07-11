export type VerificationState = 'red' | 'green' | 'rejected'
export interface TransformationVerification { proposalId: string; tests: string[]; before: VerificationState; after: VerificationState; accepted: boolean; reason: string }

/** Records red/green evidence before a visual transformation can be accepted. */
export function verifyTransformation(proposalId: string, tests: string[], beforePassed: boolean, afterPassed: boolean): TransformationVerification {
  const before: VerificationState = beforePassed ? 'green' : 'red'
  const after: VerificationState = afterPassed ? 'green' : 'red'
  const accepted = beforePassed && afterPassed
  return { proposalId, tests: [...tests], before, after: accepted ? after : 'rejected', accepted, reason: accepted ? 'baseline and transformed tests passed' : 'transformation rejected until baseline and transformed tests pass' }
}
