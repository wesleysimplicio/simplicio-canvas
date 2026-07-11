/** Minimal Node fs surface used by static contract tests; runtime browser code never imports it. */
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string
}
