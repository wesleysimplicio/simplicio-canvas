export interface DependencyRecord { name: string; version?: string; scope: 'direct' | 'transitive'; manifest: string; license?: string; vulnerabilityIds?: string[]; owners?: string[]; stale?: boolean }
export interface DependencyReport { schema: 'simplicio-dependencies/v1'; generatedAt: string; offline: boolean; dependencies: DependencyRecord[] }
export interface DependencyInput { path: string; content: string }
export function validateDependencyReport(report: unknown): string[] { if (!report || typeof report !== 'object') return ['dependency report must be an object']; const value = report as Partial<DependencyReport>; const errors: string[] = []; if (value.schema !== 'simplicio-dependencies/v1') errors.push('unsupported dependency report schema'); if (!Array.isArray(value.dependencies)) errors.push('dependencies must be an array'); for (const [i, dep] of (value.dependencies ?? []).entries()) { if (!dep.name || !dep.manifest) errors.push(`dependencies[${i}] requires name and manifest`); if (dep.scope !== 'direct' && dep.scope !== 'transitive') errors.push(`dependencies[${i}] scope must be direct or transitive`) } return errors }
export function dependencySeverity(dep: DependencyRecord): 'critical' | 'warning' | 'info' { if (dep.vulnerabilityIds?.length) return 'critical'; if (dep.stale || (dep.owners?.length ?? 0) <= 1) return 'warning'; return 'info' }

/** Parse manifests only; no network lookup is performed. Lockfiles are treated as transitive evidence. */
export function analyzeDependencies(files: DependencyInput[], generatedAt = new Date().toISOString()): DependencyReport {
  const dependencies: DependencyRecord[] = []
  for (const file of files) {
    if (/package\.json$/i.test(file.path)) {
      try {
        const manifest = JSON.parse(file.content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
        for (const [scope, values] of [['direct', manifest.dependencies], ['direct', manifest.devDependencies] ] as const) for (const [name, version] of Object.entries(values ?? {})) dependencies.push({ name, version, scope, manifest: file.path })
      } catch { /* malformed manifests remain visible to the caller as diagnostics, never as executable input */ }
    }
    if (/(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(file.path)) {
      const names = file.content.matchAll(/(?:^|\n)\s{2,}["']?(?:node_modules\/)?(@?[\w./-]+?)(?:@[^"']+)?["']?\s*:/g)
      for (const match of names) if (match[1] && !dependencies.some((dep) => dep.name === match[1] && dep.manifest === file.path)) dependencies.push({ name: match[1], scope: 'transitive', manifest: file.path })
    }
    if (/pyproject\.toml$/i.test(file.path)) for (const match of file.content.matchAll(/^\s*([A-Za-z0-9_.-]+)(?:\s*[=<>!~].*)?$/gm)) if (match[1] && !['project', 'dependencies'].includes(match[1])) dependencies.push({ name: match[1], scope: 'direct', manifest: file.path })
  }
  return { schema: 'simplicio-dependencies/v1', generatedAt, offline: true, dependencies }
}
