export type SemanticZoomLevel = 0 | 1 | 2 | 3
export interface SemanticZoomState { level: SemanticZoomLevel; breadcrumb: string[]; selectedId?: string }
const thresholds = [0.2, 0.45, 0.75]
export function semanticLevel(scale: number, previous: SemanticZoomLevel = 0): SemanticZoomLevel {
  const value = Math.max(0, Math.min(1, scale)); let level: SemanticZoomLevel = value < thresholds[0] ? 0 : value < thresholds[1] ? 1 : value < thresholds[2] ? 2 : 3
  // 3% hysteresis prevents flicker at a boundary while zooming back out.
  if (level < previous && value > thresholds[Math.max(0, previous - 1)] - .03) level = previous
  if (level > previous && value < thresholds[previous] + .03) level = previous
  return level
}
export function nextSemanticZoom(state: SemanticZoomState, scale: number, breadcrumb = state.breadcrumb): SemanticZoomState { return { ...state, level: semanticLevel(scale, state.level), breadcrumb: [...breadcrumb] } }
export function semanticLabel(level: SemanticZoomLevel): string { return ['ecosystem', 'project', 'flow', 'symbol'][level] }
