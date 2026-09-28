#!/usr/bin/env bash
# Run this FROM A PC ON YOUR HOME WIFI (same LAN as HA).
# Usage:
#   export HA_HOST=192.168.1.8
#   export HA_USER=deepak01
#   export HA_PASS='YOUR_PASSWORD'
#   export LIFEOPS_API_KEY='your-gemini-or-openai-key'   # optional
#   bash scripts/deploy-ha-ssh.sh
#
# Do NOT commit real passwords.

set -euo pipefail

HA_HOST="${HA_HOST:-192.168.1.8}"
HA_USER="${HA_USER:-deepak01}"
HA_PASS="${HA_PASS:?Set HA_PASS}"
REMOTE_DIR="${REMOTE_DIR:-/home/${HA_USER}/lifeops}"
PUBLIC_BASE="${PUBLIC_BASE:-https://ha.dktech.co.in/life-ops}"

if ! command -v sshpass >/dev/null; then
  echo "Install sshpass first (brew install hudochenkov/sshpass/sshpass or apt install sshpass)"
  exit 1
fi

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
SCP=(sshpass -e scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no)
export SSHPASS="$HA_PASS"

echo "==> Creating remote dir ${REMOTE_DIR}"
"${SSH[@]}" "${HA_USER}@${HA_HOST}" "mkdir -p '${REMOTE_DIR}'"

echo "==> Uploading project (excluding node_modules/.next/data)"
tar --exclude=node_modules --exclude=.next --exclude=data --exclude=.git \
  -czf /tmp/lifeops-deploy.tgz -C "$(dirname "$0")/.." .
"${SCP[@]}" /tmp/lifeops-deploy.tgz "${HA_USER}@${HA_HOST}:/tmp/lifeops-deploy.tgz"
"${SSH[@]}" "${HA_USER}@${HA_HOST}" "mkdir -p '${REMOTE_DIR}' && tar -xzf /tmp/lifeops-deploy.tgz -C '${REMOTE_DIR}' && rm /tmp/lifeops-deploy.tgz"

echo "==> Writing .env on host"
"${SSH[@]}" "${HA_USER}@${HA_HOST}" "cat > '${REMOTE_DIR}/.env' <<EOF
LIFEOPS_DATA_DIR=/data
LIFEOPS_COOKIE_SECURE=true
LIFEOPS_API_KEY=${LIFEOPS_API_KEY:-}
LIFEOPS_LLM_BASE_URL=${LIFEOPS_LLM_BASE_URL:-https://generativelanguage.googleapis.com/v1beta/openai/}
LIFEOPS_LLM_MODEL=${LIFEOPS_LLM_MODEL:-gemini-2.0-flash}
LIFEOPS_MEMBER1_NAME=${LIFEOPS_MEMBER1_NAME:-You}
LIFEOPS_MEMBER1_PIN=${LIFEOPS_MEMBER1_PIN:-1234}
LIFEOPS_MEMBER2_NAME=${LIFEOPS_MEMBER2_NAME:-Partner}
LIFEOPS_MEMBER2_PIN=${LIFEOPS_MEMBER2_PIN:-5678}
PORT=43127
HOSTNAME=0.0.0.0
EOF"

echo "==> Building and starting container"
"${SSH[@]}" "${HA_USER}@${HA_HOST}" "cd '${REMOTE_DIR}' && (docker compose up -d --build || docker-compose up -d --build)"

echo "==> Checking container"
"${SSH[@]}" "${HA_USER}@${HA_HOST}" "docker ps --filter name=lifeops; curl -s -o /dev/null -w 'local:%{http_code}\n' http://127.0.0.1:43127/api/auth || true"

cat <<EOF

Done (container side).

Next — reverse proxy (Nginx Proxy Manager / Cloudflare):
  ${PUBLIC_BASE}  →  http://192.168.1.8:43127
  (or http://lifeops:43127 if NPM is on the same Docker network)

Panchang app settings:
  Base URL: ${PUBLIC_BASE}
  PIN: 1234  (change after first login / reseed carefully)

Security: change the SSH password you shared in chat.
EOF
