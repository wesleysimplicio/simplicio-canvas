# Public demo deployment

The public build is intentionally read-only. It contains only the bundled `wesleysimplicio/simplicio-loop` snapshot and disables folder import, GitHub import, source editing, saving, process execution and piece dragging.

Build it with:

```bash
npm run build:demo
```

Upload it with credentials supplied only through the environment:

```bash
FTP_HOST=ftp.example.com \
FTP_USER='user' \
FTP_PASSWORD='provided-out-of-band' \
npm run deploy:demo
```

The deployment target is `/public_html/simplicio_canvas`. Never add FTP credentials to source, `.env`, shell history, issues or README files.

Live demo: <https://simpleti.com.br/simplicio_canvas/>
