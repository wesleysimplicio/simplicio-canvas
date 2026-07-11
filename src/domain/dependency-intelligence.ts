export interface DependencyRecord { name: string; version?: string; scope: 'direct' | 'transitive'; manifest: string; license?: string; vulnerabilityIds?: string[]; owners?: string[]; stale?: boolean }
export interface DependencyReport { schema: 'simplicio-dependencies/v1'; generatedAt: string; offline: boolean; dependencies: DependencyRecord[]; sources?: string[] }
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
    if (/pyproject\.toml$/i.test(file.path)) {
      const section = file.content.match(/^\s*dependencies\s*=\s*\[([\s\S]*?)\]/m)?.[1] ?? ''
      for (const match of section.matchAll(/["']([A-Za-z0-9_.-]+)(?:\s*[<>=!~].*)?["']/g)) dependencies.push({ name: match[1], scope: 'direct', manifest: file.path })
    }
  }
  const unique = dependencies.filter((dependency, index, all) => all.findIndex((item) => item.name === dependency.name && item.scope === dependency.scope && item.manifest === dependency.manifest) === index)
  return { schema: 'simplicio-dependencies/v1', generatedAt, offline: true, dependencies: unique }
}

/** Enriches a local report from CycloneDX/SPDX, npm-audit-like JSON and CODEOWNERS. No network lookup is performed. */
export function enrichDependencyReport(report: DependencyReport, files: DependencyInput[]): DependencyReport {
  const licenses = new Map<string, string>(); const vulnerabilities = new Map<string, string[]>(); const owners: string[] = []; const sources: string[] = [...(report.sources ?? [])]
  for (const file of files) {
    if (/\.(?:cdx|bom|spdx)(?:\.json)?$/i.test(file.path) || /(?:sbom|cyclonedx|spdx)/i.test(file.path)) {
      try {
        const value = JSON.parse(file.content) as { components?: Array<{ name?: string; licenses?: Array<{ license?: { id?: string; name?: string } }> }>; packages?: Array<{ name?: string; licenseConcluded?: string }> }
        for (const component of value.components ?? []) { const license = component.licenses?.map((item) => item.license?.id ?? item.license?.name).filter(Boolean)[0]; if (component.name && license) licenses.set(component.name, license) }
        for (const pack of value.packages ?? []) if (pack.name && pack.licenseConcluded) licenses.set(pack.name, pack.licenseConcluded)
        if ((value.components?.length ?? 0) || (value.packages?.length ?? 0)) sources.push(file.path)
      } catch { /* malformed SBOM remains an explicit missing metadata source */ }
    }
    if (/(?:audit|vulnerabilit|osv)/i.test(file.path) && /\.json$/i.test(file.path)) {
      try {
        const value = JSON.parse(file.content) as { vulnerabilities?: Record<string, { via?: Array<string | { source?: number | string; id?: string }> }>; results?: Array<{ package?: string; id?: string }> }
        for (const [name, finding] of Object.entries(value.vulnerabilities ?? {})) { const ids = (finding.via ?? []).flatMap((item) => typeof item === 'string' ? [item] : [String(item.id ?? item.source ?? '')]).filter(Boolean); if (ids.length) vulnerabilities.set(name, ids) }
        for (const finding of value.results ?? []) if (finding.package && finding.id) vulnerabilities.set(finding.package, [finding.id])
        if (vulnerabilities.size) sources.push(file.path)
      } catch { /* local audit is optional and never fetched */ }
    }
    if (/codeowners$/i.test(file.path)) for (const line of file.content.split(/\r?\n/)) { const clean = line.replace(/#.*$/, '').trim(); if (!clean) continue; const parts = clean.split(/\s+/); owners.push(...parts.slice(1)) }
  }
  const dependencies = report.dependencies.map((dependency) => ({ ...dependency, ...(licenses.has(dependency.name) ? { license: licenses.get(dependency.name) } : {}), ...(vulnerabilities.has(dependency.name) ? { vulnerabilityIds: vulnerabilities.get(dependency.name) } : {}), ...(owners.length ? { owners: [...new Set(owners)] } : {}) }))
  return { ...report, dependencies, sources: [...new Set(sources)] }
}
