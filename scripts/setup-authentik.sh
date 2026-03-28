#!/bin/bash
# Sets up Authentik OIDC provider and application for the workout app.
# Requires: AUTHENTIK_URL, AUTHENTIK_TOKEN environment variables.
set -euo pipefail

AUTHENTIK_URL="${AUTHENTIK_URL:-http://localhost}"
AUTHENTIK_TOKEN="${AUTHENTIK_TOKEN:-test-admin-token}"
CLIENT_ID="${CLIENT_ID:-workout-app}"
REDIRECT_URIS="${REDIRECT_URIS:-http://localhost/\nhttp://localhost:5173/}"

API="${AUTHENTIK_URL}/api/v3"
AUTH_HEADER="Authorization: Bearer ${AUTHENTIK_TOKEN}"

echo "Setting up Authentik OIDC for workout app..."
echo "Authentik URL: ${AUTHENTIK_URL}"

# Wait for Authentik to be ready
echo "Waiting for Authentik..."
for i in $(seq 1 60); do
  if curl -sf "${AUTHENTIK_URL}/-/health/ready/" > /dev/null 2>&1; then
    echo "Authentik is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Authentik not ready after 120s"
    exit 1
  fi
  sleep 2
done

# Check if provider already exists
EXISTING=$(curl -sf -H "${AUTH_HEADER}" "${API}/providers/oauth2/?search=${CLIENT_ID}" | python3 -c "import sys,json; print(json.load(sys.stdin)['pagination']['count'])" 2>/dev/null || echo "0")
if [ "$EXISTING" != "0" ]; then
  echo "OAuth2 provider '${CLIENT_ID}' already exists. Skipping setup."
  exit 0
fi

# Find the default authorization flow
echo "Finding default authorization flow..."
FLOW_SLUG=$(curl -sf -H "${AUTH_HEADER}" "${API}/flows/instances/?designation=authorization" | python3 -c "import sys,json; results=json.load(sys.stdin)['results']; print(results[0]['slug'] if results else '')" 2>/dev/null)

if [ -z "$FLOW_SLUG" ]; then
  echo "ERROR: No authorization flow found. Using 'default-provider-authorization-implicit-consent'."
  FLOW_SLUG="default-provider-authorization-implicit-consent"
fi
echo "Using authorization flow: ${FLOW_SLUG}"

# Create OAuth2 provider
echo "Creating OAuth2 provider..."
PROVIDER_ID=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/providers/oauth2/" \
  -d "{
    \"name\": \"Workout App\",
    \"authorization_flow\": \"${FLOW_SLUG}\",
    \"client_type\": \"public\",
    \"client_id\": \"${CLIENT_ID}\",
    \"redirect_uris\": \"${REDIRECT_URIS}\",
    \"property_mappings\": [],
    \"signing_key\": null,
    \"sub_mode\": \"hashed_user_id\",
    \"include_claims_in_id_token\": true,
    \"access_code_validity\": \"minutes=1\",
    \"access_token_validity\": \"hours=1\",
    \"refresh_token_validity\": \"days=30\"
  }" | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])")

if [ -z "$PROVIDER_ID" ]; then
  echo "ERROR: Failed to create OAuth2 provider"
  exit 1
fi
echo "Created OAuth2 provider (ID: ${PROVIDER_ID})"

# Create application
echo "Creating application..."
curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/core/applications/" \
  -d "{
    \"name\": \"Workout App\",
    \"slug\": \"workout-app\",
    \"provider\": ${PROVIDER_ID},
    \"meta_launch_url\": \"http://localhost/\",
    \"policy_engine_mode\": \"any\"
  }" > /dev/null

echo "Created application 'workout-app'"

# Verify OIDC discovery
echo "Verifying OIDC configuration..."
ISSUER=$(curl -sf "${AUTHENTIK_URL}/application/o/workout-app/.well-known/openid-configuration" | python3 -c "import sys,json; print(json.load(sys.stdin).get('issuer',''))" 2>/dev/null || echo "")

if [ -n "$ISSUER" ]; then
  echo "OIDC discovery OK. Issuer: ${ISSUER}"
else
  echo "WARNING: OIDC discovery endpoint not yet available (may take a moment)"
fi

echo "Authentik setup complete!"
