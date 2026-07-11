# Public demo deployment

The repository supports two builds. `npm run build:demo` is the intentionally read-only showcase build. The live HostGator release uses the interactive production build: it opens the bundled snapshot, accepts a local folder, and imports public GitHub repositories through the HostGator PHP bridge with bounded files and no credentials.

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

Live demo: <https://simpleti.com.br/simplicio_canvas/>
