# Deploying hsdevapp on a VPS

Stack: Docker + Caddy (automatic HTTPS). Data lives in a Docker volume (`appdata`).

## What you need
- A VPS with **Ubuntu 22.04 / 24.04**, at least 1 GB RAM (2 GB recommended for building).
- A **domain or subdomain** (e.g. `app.yourdomain.com`) with an **A record** pointing to the server IP.
- Ports **80** and **443** open.

## 1. Install Docker (once)
```sh
curl -fsSL https://get.docker.com | sh
```

## 2. Get the code (private repo)
Create a GitHub **deploy key** (read-only) or use a personal access token, then:
```sh
sudo mkdir -p /opt/hsdevapp && sudo chown $USER /opt/hsdevapp
git clone https://github.com/hassansakr98/hsdevapp.git /opt/hsdevapp
cd /opt/hsdevapp
```

## 3. Configure
```sh
cat > .env.production <<EOF
DOMAIN=app.yourdomain.com
AUTH_SECRET=$(openssl rand -base64 48)
EOF
chmod 600 .env.production
```
Keep `AUTH_SECRET` the same forever — changing it logs everyone out.

## 4. Start
```sh
docker compose up -d --build
docker compose logs -f app      # Ctrl+C to stop watching
```
Open `https://app.yourdomain.com` — Caddy fetches the certificate in the first minute.

## 5. Backups (daily)
```sh
crontab -e
# add:
0 3 * * * cd /opt/hsdevapp && sh deploy/backup.sh >> deploy/backups/backup.log 2>&1
```
Backups go to `deploy/backups/` (last 14 kept). Copy them off the server regularly.

Restore:
```sh
gunzip -k deploy/backups/app-YYYYMMDD-HHMMSS.db.gz
docker compose stop app
docker compose cp deploy/backups/app-YYYYMMDD-HHMMSS.db app:/data/app.db
docker compose start app
```

## Updating to a new version
```sh
cd /opt/hsdevapp && git pull && docker compose up -d --build
```

## Firewall (recommended)
```sh
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```
