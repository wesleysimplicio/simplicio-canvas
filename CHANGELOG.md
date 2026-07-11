# Changelog

## 1.4.0 — 2026-07-11

- Add a real analyzed-file Explorer tree with focus-to-canvas selection.
- Add visible Source Control governance state, protected-main guidance and host-safe Run/Debug receipts.
- Add command palette shortcuts and searchable Canvas/workspace actions.
- Add architecture policy findings, offline dependency intelligence and local SARIF export.
- Add filtered-node focus, minimap navigation and keyboard camera fit.

## 1.3.1 — 2026-07-11

- Harden the hosted demo: import controls, GitHub clone dialog and source editing are disabled and hidden at runtime.

## 1.3.0 — 2026-07-11

- Add a cross-platform, dry-run-first bootstrap receipt for `simplicio-mapper`, `simplicio-loop` and the project skill.
- Detect the canonical `.claude/skills/simplicio-loop/SKILL.md` location without performing silent installs.
- Keep the hosted demo read-only while local builds retain the importer/editor contracts.

## 1.2.0 — 2026-07-11

- Added Mapper Mermaid/JSON flow parsing, 15 selectable locales, privacy snapshot guards and renderer LOD helpers.
- Added opt-in telemetry, redacted runtime traces, architecture policy/SARIF, multi-repository manifests, recovery snapshots, onboarding and offline dependency intelligence contracts.
- Added guarded editor workspace, source control, terminal/run-debug adapters, edge refactor proposals, workspace preferences and host-side extension apply gates.
- Added real Playwright screenshot gallery and expanded validation to 102 tests.

## 1.1.0 — 2026-07-11

- Added versioned graph schema, stable identities, Python/TypeScript scanning, configurable classification and semantic explorer contracts.
- Added typed relations, visual operations, compatibility checks, deterministic change plans, generators and guarded apply/undo contracts.
- Added renderer-neutral Canvas SDK, VS Code/Cursor message contracts, workspace security, watcher, selection sync and AI proposal/audit contracts.
- Added extension build scaffold and 79-test validation gate.

## 1.0.0 — 2026-07-11

Simplicio Canvas is now a usable local-first architecture explorer:

- Import a local project folder and analyze its files, languages, imports and connections.
- Import a public GitHub repository through the local clone/Mapper bridge or browser fallback.
- Open the bundled `wesleysimplicio/simplicio-loop` example on first load.
- Navigate project, layers, flows, files and source through the Three.js canvas.
- Use the VS Code-like Explorer, tabs, terminal panel and Inspector shell.
- Switch the core interface instantly between English, Portuguese, Spanish and Simplified Chinese.
- Use the responsive phone, tablet and desktop layouts.
- Publish a locked read-only showcase at the public URL; the full import/edit workflow remains available only in the local developer build.

Validation: 55 automated tests, interactive production build, read-only demo build, public HTTPS smoke check and HostGator FTP deployment. The hosted URL is a showcase only; local development retains the import workflow.
