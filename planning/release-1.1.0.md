# Release 1.1.0 evidence

Release: [v1.2.0](https://github.com/wesleysimplicio/simplicio-canvas/releases/tag/v1.2.0)

The release adds the first renderer-neutral domain layer around the existing Three.js MVP:

- Canonical graph schema, stable IDs, analyzer adapter, Python/TypeScript scanners and configurable classification.
- Semantic zoom, typed relations, reverse relations, clustering/minimap contracts and private snapshots.
- Typed visual operations, compatibility/snap rules, deterministic change plans, Python/TypeScript generators, diff/apply gates and checkpoint/undo conflict detection.
- Canvas SDK, capability manifest, strict message/CSP contracts, workspace trust/path validation, selection sync, watcher, AI proposal validation, architecture explanations and audit log.
- VS Code/Cursor extension build scaffold.

Verification performed against the bundled `wesleysimplicio/simplicio-loop` example:

```text
npm test                 102 tests passed
npm run build            passed
npm run build:extension  passed
python3 scripts/check.py --core-gate (simplicio-loop) passed
twine check              passed for simplicio-loop 3.25.1
```

The Python companion package was published as [`simplicio-loop 3.25.1`](https://pypi.org/project/simplicio-loop/3.25.1/). The PyPI credential was used only as an environment variable and is not stored in this repository.
