export function responsiveLayout(width: number) {
  return width < 850
    ? { mode: 'mobile' as const, inspector: 'bottom-sheet' as const, legend: 'hidden' as const }
    : { mode: 'desktop' as const, inspector: 'sidebar' as const, legend: 'sidebar' as const }
}
