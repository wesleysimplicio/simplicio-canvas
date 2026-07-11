# Public demo deployment

The repository supports two builds. `npm run build:demo` is the intentionally read-only showcase build used by the public URL. The default production build remains interactive for local development: it accepts a local folder and can import public GitHub repositories when run on a developer machine.

Build it with:

```bash
npm run build:demo
```

Upload the production release with credentials supplied only through the environment:

```bash
FTP_HOST=ftp.example.com \
FTP_USER='user' \
FTP_PASSWORD='provided-out-of-band' \
npm run deploy:demo
```

The deployment target is `/public_html/simplicio_canvas`. Never add FTP credentials to source, `.env`, shell history, issues or README files.

Live demo (read-only): <https://simpleti.com.br/simplicio_canvas/>

The public deployment contains only the bundled `wesleysimplicio/simplicio-loop` snapshot. Import controls, GitHub/network import, source editing, saving, process execution and piece dragging are disabled at build time and at runtime. The public PHP import bridge is intentionally not deployed, and `/api/github/import` must not be treated as a public capability.
