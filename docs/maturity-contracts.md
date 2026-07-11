# Maturity contracts

The Canvas keeps maturity features renderer-independent and local-first. The contracts in `src/domain/` are intentionally pure TypeScript so the web demo, extension and future `simplicio-loop` adapters can share validation without granting browser code host capabilities.

| Contract | Boundary | Evidence |
| --- | --- | --- |
| `telemetry.ts` | Diagnostics are denied until explicit consent; event keys reject source, path, URL, prompt and secret-like data. | `tests/maturity-contracts.test.ts` |
| `runtime-trace.ts` | Runtime spans are a separate, redacted evidence type. Import rejects identity/content attributes and emits typed runtime edges. | `tests/maturity-contracts.test.ts` |
| `architecture-policy.ts` | Layer rules produce findings with file evidence and SARIF; this module never applies a change. | `tests/maturity-contracts.test.ts` |
| `multi-repo.ts` | Repositories carry revision, branch, dirty and access state; cross-repository edges must reference known repositories. | `tests/maturity-contracts.test.ts` |
| `workspace-recovery.ts` | Snapshots are versioned and checksummed. Corrupt snapshots return `inspect`, never silent restore. | `tests/maturity-contracts.test.ts` |
| `onboarding.ts` | First-run steps are local, skippable/resettable state; no analytics are required to progress. | `tests/maturity-contracts.test.ts` |
| `dependency-intelligence.ts` | Dependency reports declare direct/transitive scope and support offline severity classification. Network lookup is not implicit. | `tests/maturity-contracts.test.ts` |

These are integration-ready foundations, not claims that the browser can execute processes, access private repositories, ingest production telemetry or mutate source. Those capabilities require an explicit trusted-host adapter and remain separate follow-up work.
