# Compatibility matrix

`fixtures/compatibility-matrix.json` is a metadata-only compatibility ledger. It records repository slug, stack, size class, verification state and source policy; it never vendors or redistributes repository source.

Run `npm run verify:compatibility` in CI. The verifier rejects duplicate IDs, invalid GitHub slugs, unknown stacks/statuses and any source policy other than `metadata-only`. `verified` means an end-to-end scan has evidence, `partial` means known capabilities were exercised with gaps, and `planned` means the repository is queued but not yet claimed as supported.

Current fixture coverage: Simplicio Loop, Requests, Vite, .NET Runtime, Spring Petclinic and Free Programming Books across Python, TypeScript, .NET, Java and polyglot stacks.

`npm run scan:compatibility` runs the offline harness. Maintainers may run `node scripts/scan-compatibility.mjs --output=output/compatibility-scan.json` for a metadata-only GitHub check; it requests only `/repos/{owner}/{repo}` and records branch, license, size and availability. It never requests repository trees, blobs or source files. Network failures remain `unavailable` entries rather than being converted into support claims.
