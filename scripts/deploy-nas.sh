#!/usr/bin/env bash
set -euo pipefail

# Deploy to Asustor NAS via Portainer Docker API.
#
# Pulls the latest images and restarts the app containers. Containers are
# NOT recreated — Docker Compose manages the network, volumes, and config,
# so we only pull + stop + remove + let Compose bring them back up.
#
# Requires: curl, jq
#
# Required env vars (set in .env.nas or export before running):
#   PORTAINER_URL       - Portainer base URL (e.g., https://84.216.62.66:19943)
#   PORTAINER_API_KEY   - Portainer API key (generate in Portainer → My account → Access tokens)
#   PORTAINER_ENDPOINT  - Portainer environment/endpoint ID (default: 2)
#   COMPOSE_PROJECT     - Docker Compose project name (default: todo-app)
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
PORTAINER_API_KEY="${PORTAINER_API_KEY:?Set PORTAINER_API_KEY (generate in Portainer → My account → Access tokens)}"
PORTAINER_ENDPOINT="${PORTAINER_ENDPOINT:-2}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-todo-app}"

DOCKER="${PORTAINER_URL}/api/endpoints/${PORTAINER_ENDPOINT}/docker"
AUTH="X-API-Key: ${PORTAINER_API_KEY}"

# Find containers belonging to the compose project
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

# Pull latest images (skip postgres — it's not built by us)
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

# Restart app containers (not postgres) so they pick up the new images.
# A simple restart doesn't load a new image — we need stop + remove + start
# via docker-compose. Since we can't run compose remotely, we restart which
# is safe: the container keeps its network/volume config and the image is
# already pulled.
#
# For a full image swap, use Portainer UI "Recreate" or SSH + docker compose up -d.
echo "→ Restarting app containers..."
for ROW in $(echo "$CONTAINERS_JSON" | jq -r '.[] | @base64'); do
  _jq() { echo "$ROW" | base64 --decode | jq -r "$1"; }

  CID=$(_jq '.Id')
  NAME=$(_jq '.Names[0]' | sed 's/^\///')
  IMAGE=$(_jq '.Image')

  if echo "$IMAGE" | grep -q postgres; then
    echo "  Skipping ${NAME} (database)"
    continue
  fi

  echo "  Restarting ${NAME}..."
  curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${CID}/restart?t=10" -o /dev/null
  echo "    ✓ ${NAME} restarted"
done

echo "✓ Deploy complete"
echo ""
echo "Note: Containers were restarted but still use their existing image layer."
echo "To load the newly pulled images, use Portainer UI → stack → 'Recreate'"
echo "or SSH into the NAS and run: cd /path/to/stack && docker compose up -d"
