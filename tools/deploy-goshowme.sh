#!/usr/bin/env bash
# Publish dist/ to https://goshow.me/runstop64/ (only works on the goshow.me server).
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=/var/www/vhosts/goshow.me/httpdocs/runstop64
nice -n 10 npm run build
mkdir -p "$DEST"
rsync -a --delete dist/ "$DEST/"
chown -R goshowme:psacln "$DEST"
find "$DEST" -type d -exec chmod 755 {} + && find "$DEST" -type f -exec chmod 644 {} +
echo "deployed to https://goshow.me/runstop64/"
