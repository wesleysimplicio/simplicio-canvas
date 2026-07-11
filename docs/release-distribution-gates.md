# Distribution gates

The tag workflow `.github/workflows/release-extension.yml` packages the VSIX,
writes a SHA-256 sidecar and CycloneDX metadata, verifies both, and enforces a
runtime asset/cold-start budget. It then signs with Cosign keyless when the
action can obtain an OIDC identity, or Minisign only when both the binary and
`MINISIGN_SECRET_KEY` exist. If neither path is available, the job fails closed
and uploads no unsigned release artifact.

The workflow does not contain signing keys. Publisher configuration is still
required: GitHub Actions OIDC trust for Cosign, or a protected Minisign secret
and runner binary. Local builds intentionally remain checksum-only.
