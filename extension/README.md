# Simplicio Canvas editor host (scaffold)

This directory documents the planned VS Code/Cursor host boundary. The current
web MVP does not install an extension and does not execute local processes.

An eventual host should:

1. create a webview with a strict nonce-based CSP;
2. send only the versioned messages in `src/domain/extension-protocol.ts`;
3. mount the renderer-neutral `CanvasStore`/`CanvasHandle` contract;
4. gate workspace writes on trust, path boundaries, diff preview and an explicit
   user confirmation; and
5. dispose watchers and message listeners when the editor panel closes.

The shared contracts are tested in `tests/m3-m4-contracts.test.ts`. This keeps
the extension work safe to implement incrementally without coupling the web
demo to a browser filesystem or a VS Code runtime.

`npm run build:extension` type-checks the host adapter scaffold. The
`extension/extension-manifest.json` is a VS Code/Cursor-compatible manifest and
`node scripts/validate-extension.mjs` validates its activation command and
engine metadata. Packaging still requires the host's approved bundler/`vsce`;
the browser MVP never installs or executes this adapter.
