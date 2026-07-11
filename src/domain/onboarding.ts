export type OnboardingState = 'not-started' | 'active' | 'completed' | 'skipped'
export interface OnboardingStep { id: string; title: string; target: string; description: string }
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  { id: 'project', title: 'Project view', target: '#canvas', description: 'Start from the bundled project snapshot.' },
  { id: 'zoom', title: 'Semantic zoom', target: '#zoom-in', description: 'Move from projects to files and symbols.' },
  { id: 'flow', title: 'Trace a flow', target: '#flow-mode', description: 'Inspect documented flows and their evidence.' },
  { id: 'source', title: 'Open source', target: '#selection', description: 'Select a piece to inspect its source evidence.' },
]
export interface OnboardingProgress { state: OnboardingState; step: number; version: 1 }
export function nextOnboarding(progress: OnboardingProgress): OnboardingProgress { return progress.step + 1 >= ONBOARDING_STEPS.length ? { ...progress, state: 'completed', step: ONBOARDING_STEPS.length - 1 } : { ...progress, state: 'active', step: progress.step + 1 } }
export function resetOnboarding(): OnboardingProgress { return { version: 1, state: 'not-started', step: 0 } }
