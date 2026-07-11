export function responsiveLayout(width: number, height = 900) {
  if (height < 500) return { mode: 'compact' as const, inspector: 'bottom-sheet' as const, legend: 'hidden' as const, hud: 'minimal' as const }
  if (width < 700) return { mode: 'mobile' as const, inspector: 'bottom-sheet' as const, legend: 'hidden' as const, hud: 'compact' as const }
  if (width < 1200) return { mode: 'tablet' as const, inspector: 'sidebar' as const, legend: 'drawer' as const, hud: 'compact' as const }
  if (width >= 1920) return { mode: 'wide' as const, inspector: 'sidebar' as const, legend: 'sidebar' as const, hud: 'full' as const }
  return { mode: 'desktop' as const, inspector: 'sidebar' as const, legend: 'sidebar' as const, hud: 'full' as const }
}
