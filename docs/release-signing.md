# Release signing boundary

Canvas does not store signing keys or execute shell commands. CI injects a
`SigningCommandRunner` backed by the approved Cosign or Minisign installation.

The provider receives only the canonical artifact payload (name, version,
platform and SHA-256). `sign()` must return the tool's real signature output;
`verify()` returns true only when the configured public key validates it. A
checksum-only receipt is intentionally not treated as signed.

The fixture `fixtures/signing-unsigned.json` is deliberately unsigned and
must remain so. It proves that the release contract does not manufacture a
signature in tests. Production CI should attach the provider receipt and fail
publication when verification is unavailable or false.
