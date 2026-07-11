# Compatibility matrix

Canvas tracks representative public repositories without vendoring their source. The machine-readable manifest is [`fixtures/compatibility-matrix.json`](../fixtures/compatibility-matrix.json); `npm run test:compatibility` validates its schema and privacy boundary.

| Repository | Stack | Size | Status |
|---|---|---:|---|
| `wesleysimplicio/simplicio-loop` | Python | small | verified |
| `psf/requests` | Python | medium | partial |
| `vitejs/vite` | TypeScript | large | partial |
| `dotnet/runtime` | .NET | large | planned |
| `spring-projects/spring-petclinic` | Java | small | planned |
| `EbookFoundation/free-programming-books` | polyglot | large | planned |

“Verified” means a local scan has browser/test evidence. “Partial” means the repository is a bounded public-import target but not yet a full golden fixture. “Planned” is tracked for the next compatibility run. The matrix stores repository identifiers and measurements only; it never redistributes repository source.
