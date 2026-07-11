# 🧩 Simplicio Canvas — visual software assembly

<p align="center">
  <strong>English</strong> · <a href="docs/i18n/README.pt-BR.md">Português</a> · <a href="docs/i18n/README.es.md">Español</a> · <a href="docs/i18n/README.fr.md">Français</a> · <a href="docs/i18n/README.de.md">Deutsch</a> · <a href="docs/i18n/README.it.md">Italiano</a> · <a href="docs/i18n/README.nl.md">Nederlands</a> · <a href="docs/i18n/README.pl.md">Polski</a> · <a href="docs/i18n/README.ru.md">Русский</a> · <a href="docs/i18n/README.uk.md">Українська</a> · <a href="docs/i18n/README.tr.md">Türkçe</a> · <a href="docs/i18n/README.ar.md">العربية</a> · <a href="docs/i18n/README.hi.md">हिन्दी</a> · <a href="docs/i18n/README.ja.md">日本語</a> · <a href="docs/i18n/README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <img src="assets/simplicio-canvas-overview.png" alt="Simplicio Canvas renders a software project as connected puzzle pieces in a Three.js workspace" width="920" />
</p>

<p align="center">
  <a href="https://github.com/wesleysimplicio/simplicio-canvas/actions"><img src="https://img.shields.io/github/actions/workflow/status/wesleysimplicio/simplicio-canvas/ci.yml?branch=main&label=checks" alt="Checks"></a>
  <a href="https://github.com/wesleysimplicio/simplicio-canvas/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/local--first-private-67E8A5" alt="Local first and private">
  <img src="https://img.shields.io/badge/Three.js-3D%20canvas-FF5D73" alt="Three.js 3D canvas">
</p>

<p align="center">
  <strong>Open a folder. See its languages, files, imports, and architecture as a workspace you can assemble.</strong>
</p>

---

## ⚡ TL;DR

Simplicio Canvas is an early local-first prototype for visual programming. Its default workspace is the public [`wesleysimplicio/simplicio-loop`](https://github.com/wesleysimplicio/simplicio-loop) project, represented by a safe bundled snapshot. It turns a project folder into colored puzzle pieces on a Three.js canvas inside a VS Code-like workspace:

- **Color** represents the software layer: presentation, application, domain, infrastructure, tests, docs, and configuration.
- **Pieces** represent responsibilities such as screen, service, entity, repository, adapter, and test.
- **Curves** represent real internal imports detected from source files.
- **Click** a file to inspect language, imports, reverse imports, and its source in a read-only terminal.
- **Drag** a piece to rearrange the architecture view without changing the source tree.

The browser reads files only in local memory. It never uploads project contents.

## 🚀 Run locally

```bash
git clone https://github.com/wesleysimplicio/simplicio-canvas.git
cd simplicio-canvas
npm install
npm run dev
```

Open the local URL and choose either:

- **Open folder** — authorize a folder already on the machine.
- **GitHub** — enter a public `owner/repository`; the guarded local Vite bridge performs a shallow clone under `.simplicio/workspaces`, attempts `simplicio-mapper`, and the browser has a public-API fallback when the local bridge is unavailable.

![GitHub clone and Mapper import dialog](output/playwright/github-import-dialog.png)

The first screen already opens the official `wesleysimplicio/simplicio-loop` example. The planned bootstrap will also prepare `simplicio-mapper` and the installed `simplicio-loop` project skill; until that installer lands, both integrations remain explicit and local-first.

## 🖥️ Real MVP proof

### VS Code-like workspace

![Desktop IDE shell with Activity Bar, Explorer, Three.js Canvas, terminal and inspector](output/playwright/vscode-shell-desktop.png)

### Native responsive behavior

| Phone portrait | Phone landscape |
|---|---|
| ![Phone portrait](output/playwright/responsive-phone-portrait.png) | ![Phone landscape](output/playwright/responsive-phone-landscape.png) |

| Tablet | Desktop |
|---|---|
| ![Tablet](output/playwright/responsive-tablet.png) | ![Desktop](output/playwright/responsive-desktop.png) |

<details>
<summary>More captured evidence</summary>

![Mobile IDE shell](output/playwright/vscode-shell-mobile.png)
![Original mobile Canvas proof](output/playwright/mobile-canvas-390x844.png)
![Initial Three.js MVP](output/playwright/simplicio-canvas-mvp.png)
![Top-down project telemetry](output/playwright/top-down-project-hud.png)
![Editable source terminal](output/playwright/example-source-terminal.png)
![Universe navigation and README flows](output/playwright/universe-navigation-and-readme-flows.png)
![Local folder analysis](output/playwright/folder-analysis-mvp.png)

</details>

## 🧭 What the MVP analyzes

| Area | Current behavior |
|---|---|
| Languages | TypeScript, JavaScript, Python, Rust, Go, C#, Java, Kotlin, frontend/config formats and documentation |
| Relations | TypeScript/JavaScript and Python imports, with internal path resolution and external package detection |
| Privacy | Local browser memory only; ignores `.git`, `node_modules`, environments, build artifacts, binaries, and files larger than 1 MB |
| Interaction | Orbit, zoom, drag pieces, inspect source and dependencies |
| Rendering | Three.js puzzle pieces, labels, layers and dependency curves |

This is deliberately a static-analysis MVP. It does **not** write source files, run code, or claim complete call-graph accuracy.

## 🗺️ Where it is going

The product direction is semantic zoom rather than a flat graph:

```text
ecosystem → project → layer / flow → file → class / method
```

The next capability is to enrich this view with stable symbols, call graphs, end-to-end flows, safe visual refactors, diff previews, validation, and undo.

The canonical roadmap lives in [GitHub milestones](https://github.com/wesleysimplicio/simplicio-canvas/milestones) and [GitHub issues](https://github.com/wesleysimplicio/simplicio-canvas/issues). Local planning files are reference exports only.

## 🧠 Enriching with simplicio-mapper

For a richer model of a real repository, generate mapper artifacts locally:

```bash
simplicio-mapper scan /path/to/project --sync --await --json
simplicio-mapper inspect /path/to/project --json
```

Then use **Import map** in the UI to load a JSON artifact. The current importer reads artifact paths; consuming the complete mapper symbol, call-graph, and flow contracts is the next integration milestone.

## 🧪 Verification

```bash
npm test
npm run build
```

The domain analyzer and visual grammar are covered by Vitest. Browser proof is captured with Playwright.

## 📜 License

[MIT](LICENSE)

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=wesleysimplicio/simplicio-canvas&type=Date)](https://www.star-history.com/#wesleysimplicio/simplicio-canvas&Date)
