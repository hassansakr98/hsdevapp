#!/bin/sh
# Daily database backup. Run from the project folder on the server:
#   sh deploy/backup.sh
# Cron (every day at 03:00):
#   0 3 * * * cd /opt/hsdevapp && sh deploy/backup.sh >> deploy/backups/backup.log 2>&1
set -e
cd "$(dirname "$0")/.."
mkdir -p deploy/backups
STAMP=$(date +%Y%m%d-%H%M%S)

# VACUUM INTO makes a consistent copy even while the app is running
docker compose exec -T app node -e "
  const { DatabaseSync } = require('node:sqlite');
  new DatabaseSync('/data/app.db').exec(\"VACUUM INTO '/data/backup.db'\");
"
docker compose cp app:/data/backup.db "deploy/backups/app-$STAMP.db"
docker compose exec -T app rm -f /data/backup.db
gzip "deploy/backups/app-$STAMP.db"

# keep the last 14 backups
ls -1t deploy/backups/app-*.db.gz | tail -n +15 | xargs -r rm -f
echo "$(date) backup ok: app-$STAMP.db.gz"
