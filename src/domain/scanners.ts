import { createGraphId, type GraphEvidence, type GraphNode, type GraphEdge } from './graph-schema'

export interface ScanDiagnostic { path: string; severity: 'warning' | 'error'; message: string; line?: number }
export interface ScanResult { nodes: GraphNode[]; edges: GraphEdge[]; diagnostics: ScanDiagnostic[] }
const evidence = (path: string, line: number, reason: string): GraphEvidence => ({ source: 'static', confidence: .9, reason, location: { path, line } })

function lineNumber(content: string, offset: number): number { return content.slice(0, offset).split('\n').length }
function scanSymbols(path: string, content: string, language: 'python' | 'typescript'): ScanResult {
  const nodes: GraphNode[] = []; const edges: GraphEdge[] = []; const diagnostics: ScanDiagnostic[] = []
  const project = 'scan'
  const classPattern = language === 'python' ? /^\s*class\s+([A-Za-z_]\w*)/gm : /\bclass\s+([A-Za-z_]\w*)/g
  const functionPattern = language === 'python' ? /^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm : /\b(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(|\b(?:const|let)\s+([A-Za-z_]\w*)\s*=\s*(?:async\s*)?\(/g
  for (const match of content.matchAll(classPattern)) { const name = match[1]; const line = lineNumber(content, match.index ?? 0); nodes.push({ id: createGraphId('class', project, path, name), kind: 'class', name, path, evidence: [evidence(path, line, 'class declaration')] }) }
  for (const match of content.matchAll(functionPattern)) { const name = match[1] ?? match[2]; const line = lineNumber(content, match.index ?? 0); nodes.push({ id: createGraphId('function', project, path, name), kind: 'function', name, path, evidence: [evidence(path, line, 'function declaration')] }) }
  const imports = language === 'python' ? /^(?:\s*from\s+([\w.]+)\s+import|\s*import\s+([\w.]+))/gm : /\b(?:import\s+(?:[\s\S]*?\s+from\s+)?|export\s+[\s\S]*?\s+from\s+|import\s*\()\s*['"]([^'"]+)['"]/g
  for (const match of content.matchAll(imports)) { const specifier = match[1] ?? match[2] ?? match[3]; const line = lineNumber(content, match.index ?? 0); const target = createGraphId('symbol', project, specifier); edges.push({ id: createGraphId('symbol', project, path, `import:${specifier}`), from: createGraphId('file', project, path), to: target, type: 'import', label: specifier, evidence: [evidence(path, line, 'static import declaration')] }) }
  return { nodes, edges, diagnostics }
}

export function scanPython(path: string, content: string): ScanResult {
  try { return scanSymbols(path, content, 'python') } catch (error) { return { nodes: [], edges: [], diagnostics: [{ path, severity: 'error', message: (error as Error).message }] } }
}
export function scanTypeScript(path: string, content: string): ScanResult {
  try { return scanSymbols(path, content, 'typescript') } catch (error) { return { nodes: [], edges: [], diagnostics: [{ path, severity: 'error', message: (error as Error).message }] } }
}
