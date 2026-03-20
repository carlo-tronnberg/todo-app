#!/usr/bin/env bash
set -euo pipefail

# Deploy to Asustor NAS via Portainer Docker API.
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
  # Split image:tag
  REPO="${IMAGE%%:*}"
  TAG="${IMAGE#*:}"
  [[ "$TAG" == "$IMAGE" ]] && TAG="latest"

  echo "  Pulling ${REPO}:${TAG}..."
  PULL_RESULT=$(curl -sk -X POST -H "$AUTH" \
    "${DOCKER}/images/create?fromImage=${REPO}&tag=${TAG}" 2>&1)

  if echo "$PULL_RESULT" | grep -q '"error"'; then
    echo "  ⚠ Failed to pull ${REPO}:${TAG}"
    echo "$PULL_RESULT" | grep -o '"error":"[^"]*"' | head -1
  fi
done

# Recreate containers one by one (stop → remove → create → start)
echo "→ Recreating containers..."
for ROW in $(echo "$CONTAINERS_JSON" | jq -r '.[] | @base64'); do
  _jq() { echo "$ROW" | base64 --decode | jq -r "$1"; }

  CID=$(_jq '.Id')
  NAME=$(_jq '.Names[0]' | sed 's/^\///')
  IMAGE=$(_jq '.Image')

  # Skip postgres — don't recreate the database container
  if echo "$IMAGE" | grep -q postgres; then
    echo "  Skipping ${NAME} (database)"
    continue
  fi

  echo "  Recreating ${NAME}..."

  # Get full container config for recreation
  INSPECT=$(curl -sk -H "$AUTH" "${DOCKER}/containers/${CID}/json")

  # Stop
  curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${CID}/stop?t=10" -o /dev/null 2>/dev/null || true

  # Rename old container so we can reuse the name
  curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${CID}/rename?name=${NAME}_old" -o /dev/null 2>/dev/null || true

  # Create new container from the pulled image with same config
  CREATE_BODY=$(echo "$INSPECT" | jq '{
    Image: .Config.Image,
    Env: .Config.Env,
    ExposedPorts: .Config.ExposedPorts,
    Cmd: .Config.Cmd,
    Entrypoint: .Config.Entrypoint,
    Labels: .Config.Labels,
    HostConfig: .HostConfig,
    NetworkingConfig: {
      EndpointsConfig: .NetworkSettings.Networks
    }
  }')

  NEW_CID=$(curl -sk -X POST -H "$AUTH" -H "Content-Type: application/json" \
    "${DOCKER}/containers/create?name=${NAME}" \
    -d "$CREATE_BODY" | jq -r '.Id // empty')

  if [[ -n "$NEW_CID" ]]; then
    # Start the new container
    curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${NEW_CID}/start" -o /dev/null
    # Remove the old container
    curl -sk -X DELETE -H "$AUTH" "${DOCKER}/containers/${CID}?force=true" -o /dev/null 2>/dev/null || true
    echo "    ✓ ${NAME} recreated"
  else
    echo "    ✗ Failed to create new container, restoring old one..."
    curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${CID}/rename?name=${NAME}" -o /dev/null 2>/dev/null || true
    curl -sk -X POST -H "$AUTH" "${DOCKER}/containers/${CID}/start" -o /dev/null 2>/dev/null || true
  fi
done

echo "✓ Deploy complete"
