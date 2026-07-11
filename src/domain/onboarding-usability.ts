import type { OnboardingProgress } from './onboarding'
import type { CacheDiagnostic } from './workspace-cache'

export type OnboardingAnnouncement = { state: OnboardingProgress['state']; message: string; actionable: boolean }
export function onboardingAnnouncement(progress: OnboardingProgress): OnboardingAnnouncement {
  if (progress.state === 'completed') return { state: progress.state, message: 'Tour concluído. Você pode reabrir o guia nas configurações.', actionable: false }
  if (progress.state === 'skipped') return { state: progress.state, message: 'Tour pausado. Reabra-o quando quiser entender o Canvas.', actionable: true }
  return { state: progress.state, message: `Etapa ${progress.step + 1}: explore o projeto local com segurança.`, actionable: true }
}
export function recoveryAnnouncement(status: CacheDiagnostic): { message: string; actions: Array<'restore' | 'discard' | 'inspect'> } {
  if (status === 'valid') return { message: 'Snapshot local pronto para restaurar.', actions: ['restore', 'inspect', 'discard'] }
  if (status === 'missing') return { message: 'Nenhum snapshot local encontrado; continue com o projeto atual.', actions: [] }
  return { message: 'Snapshot precisa de inspeção antes de qualquer restauração.', actions: ['inspect', 'discard'] }
}
