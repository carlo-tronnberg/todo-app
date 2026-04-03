#!/usr/bin/env bash
set -euo pipefail

# Deploy to Asustor NAS via Portainer API (image pull) + SSH (compose up).
#
# Requires: curl, jq, ssh
#
# Required env vars (set in .env.nas or export before running):
#   PORTAINER_URL       - Portainer base URL (e.g., https://84.216.62.66:19943)
#   PORTAINER_API_KEY   - Portainer API key
#   PORTAINER_ENDPOINT  - Portainer environment/endpoint ID (default: 2)
#   COMPOSE_PROJECT     - Docker Compose project name (default: todo-app)
#   NAS_SSH             - SSH connection string (e.g., root@84.216.62.66)
#   NAS_COMPOSE_DIR     - Path to docker compose dir on NAS (e.g., /volume1/home/carlo/todo-app/docker)
#
# Usage:
#   npm run deploy:nas

command -v jq >/dev/null 2>&1 || { echo "✗ jq is required. Install with: brew install jq"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.nas"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

PORTAINER_URL="${PORTAINER_URL:?Set PORTAINER_URL (e.g., https://84.216.62.66:19943)}"
PORTAINER_API_KEY="${PORTAINER_API_KEY:?Set PORTAINER_API_KEY}"
PORTAINER_ENDPOINT="${PORTAINER_ENDPOINT:-2}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-todo-app}"
NAS_SSH="${NAS_SSH:?Set NAS_SSH (e.g., root@84.216.62.66)}"
NAS_COMPOSE_DIR="${NAS_COMPOSE_DIR:?Set NAS_COMPOSE_DIR (e.g., /volume1/home/carlo/todo-app/docker)}"

DOCKER="${PORTAINER_URL}/api/endpoints/${PORTAINER_ENDPOINT}/docker"
AUTH="X-API-Key: ${PORTAINER_API_KEY}"

# ── Step 1: Find containers ──────────────────────────────────────────────────

echo "→ Finding containers for project '${COMPOSE_PROJECT}'..."
CONTAINERS_JSON=$(curl -sk -H "$AUTH" \
  "${DOCKER}/containers/json?all=true&filters=%7B%22label%22%3A%5B%22com.docker.compose.project%3D${COMPOSE_PROJECT}%22%5D%7D")

CONTAINER_COUNT=$(echo "$CONTAINERS_JSON" | jq 'length')
if [[ "$CONTAINER_COUNT" == "0" ]]; then
  echo "✗ No containers found for compose project '${COMPOSE_PROJECT}'"
  echo "  Checking all compose projects on this endpoint..."
  curl -sk -H "$AUTH" "${DOCKER}/containers/json?all=true" \
    | jq -r '.[].Labels["com.docker.compose.project"] // empty' | sort -u | sed 's/^/    - /'
  exit 1
fi

echo "  Found ${CONTAINER_COUNT} container(s):"
echo "$CONTAINERS_JSON" | jq -r '.[] | "    \(.Names[0] | ltrimstr("/")) → \(.Image) (\(.State))"'

# ── Step 2: Pull latest images via Portainer API ─────────────────────────────

echo "→ Pulling latest images..."
IMAGES=$(echo "$CONTAINERS_JSON" | jq -r '.[].Image' | grep -v postgres | sort -u)

for IMAGE in $IMAGES; do
  REPO="${IMAGE%%:*}"
  TAG="${IMAGE#*:}"
  [[ "$TAG" == "$IMAGE" ]] && TAG="latest"

  echo "  Pulling ${REPO}:${TAG}..."
  curl -sk -X POST -H "$AUTH" \
    "${DOCKER}/images/create?fromImage=${REPO}&tag=${TAG}" \
    -o /dev/null
done

# ── Step 3: Recreate containers via SSH + docker compose ─────────────────────

echo "→ Recreating containers via SSH (${NAS_SSH})..."
ssh -o StrictHostKeyChecking=accept-new "${NAS_SSH}" \
  "cd ${NAS_COMPOSE_DIR} && docker compose -f docker-compose.prod.yml up -d" 2>&1 \
  | sed 's/^/  /'

echo "✓ Deploy complete"
