# Release readiness scorecard

The machine-readable scorecard is [`fixtures/release-readiness.json`](../fixtures/release-readiness.json). It is intentionally honest: a category is `verified` only when a local command or browser artifact proves the claim; unresolved product work remains `partial`.

Concrete scan and screenshot measurements live in [`fixtures/compatibility-evidence.json`](../fixtures/compatibility-evidence.json) and are checked by `npm run test:evidence`. The verified `simplicio-loop` capture records 22 nodes/files, 18 imports, 4 documented flows, zero diagnostics and the tracked Playwright desktop screenshot.

| Category | Status | Evidence |
|---|---|---|
| Security | verified | `npm test` |
| Privacy | verified | `npm run test:privacy` |
| Performance | verified | `npm run benchmark:render` and `npm run benchmark:webgl` |
| Accessibility | verified | `npm run test:a11y` |
| Compatibility | partial | `npm run test:compatibility` and nightly scan workflow |
| Recovery | verified | workspace cache/recovery tests |
| Distribution | partial | `npm run verify:pwa`; signed desktop artifacts remain |

This scorecard is the closure evidence for the maturity epics (#38 and #50) without disguising remaining child issues (#57 and #61). GitHub issues remain the source of truth for scope and acceptance.
