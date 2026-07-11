# 🧩 Simplicio Canvas — visual software assembly

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

Simplicio Canvas is an early local-first prototype for visual programming. It turns a project folder into colored puzzle pieces on a Three.js canvas:

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

Open the local URL, click **Open project**, and select a folder.

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
