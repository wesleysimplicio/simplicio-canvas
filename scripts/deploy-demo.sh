#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?Set FTP_HOST without committing it}"
: "${FTP_USER:?Set FTP_USER without committing it}"
: "${FTP_PASSWORD:?Set FTP_PASSWORD without committing it}"

npm run build:demo
export LFTP_PASSWORD="$FTP_PASSWORD"
lftp -u "$FTP_USER" "ftp://$FTP_HOST" -e \
  "set net:timeout 20; set net:max-retries 2; mirror -R dist-demo /public_html/simplicio_canvas; bye"
echo "Demo uploaded to /public_html/simplicio_canvas"
