# Desktop artifact verification

`npm run verify:artifact` verifies a packaged VSIX against a detached `.sha256` sidecar and fails when the checksum is missing, malformed or mismatched. Publishers can generate a CycloneDX metadata SBOM with:

```bash
node scripts/verify-artifact.mjs extension/artifacts/simplicio-canvas-0.1.0.vsix --require-checksum --sbom=output/canvas.sbom.json
```

The verifier records artifact size and SHA-256 only. It does not inspect or redistribute source. The report explicitly keeps detached signing as a publisher responsibility (`signature: detached-signature-required-by-publisher`); a checksum is integrity evidence, not a forged claim of code-signing trust.
