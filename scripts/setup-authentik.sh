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

# Find the implicit consent authorization flow (skip consent screen)
echo "Finding authorization flow..."
FLOW_PK=$(curl -sf -H "${AUTH_HEADER}" "${API}/flows/instances/?designation=authorization" | python3 -c "
import sys,json
results=json.load(sys.stdin)['results']
# Prefer implicit consent flow
implicit = [r for r in results if 'implicit' in r['slug']]
print((implicit or results)[0]['pk'] if results else '')
" 2>/dev/null)

if [ -z "$FLOW_PK" ]; then
  echo "ERROR: No authorization flow found."
  exit 1
fi
echo "Using authorization flow: ${FLOW_PK}"

# Find OAuth scope mappings for email, openid, profile
echo "Finding OAuth scope mappings..."
SCOPE_MAPPINGS=$(curl -sf -H "${AUTH_HEADER}" "${API}/propertymappings/all/?page_size=50" | python3 -c "
import sys,json
data = json.load(sys.stdin)
pks = [r['pk'] for r in data.get('results',[])
       if 'OAuth Mapping' in r.get('name','')
       and any(s in r['name'] for s in [\"'email'\", \"'openid'\", \"'profile'\"])]
print(json.dumps(pks))
" 2>/dev/null)
echo "Scope mappings: ${SCOPE_MAPPINGS}"

# Find a signing key
SIGNING_KEY=$(curl -sf -H "${AUTH_HEADER}" "${API}/crypto/certificatekeypairs/?ordering=name&has_key=true" | python3 -c "
import sys,json
results = json.load(sys.stdin)['results']
print(results[0]['pk'] if results else 'null')
" 2>/dev/null)
echo "Signing key: ${SIGNING_KEY}"

# Create OAuth2 provider
echo "Creating OAuth2 provider..."
PROVIDER_ID=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/providers/oauth2/" \
  -d "{
    \"name\": \"Workout App\",
    \"authorization_flow\": \"${FLOW_PK}\",
    \"client_type\": \"public\",
    \"client_id\": \"${CLIENT_ID}\",
    \"redirect_uris\": \"${REDIRECT_URIS}\",
    \"property_mappings\": ${SCOPE_MAPPINGS},
    \"signing_key\": \"${SIGNING_KEY}\",
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

# Set up enrollment (sign-up) flow
echo "Setting up enrollment flow..."

# Create prompt fields
USERNAME_FIELD=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/prompt/prompts/" \
  -d '{"name":"enrollment-username","field_key":"username","label":"Username","type":"username","required":true,"placeholder":"Username","order":0}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

EMAIL_FIELD=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/prompt/prompts/" \
  -d '{"name":"enrollment-email","field_key":"email","label":"Email","type":"email","required":true,"placeholder":"Email","order":1}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

PASS_FIELD=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/prompt/prompts/" \
  -d '{"name":"enrollment-password","field_key":"password","label":"Password","type":"password","required":true,"placeholder":"Password","order":2}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

PASS_REPEAT=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/prompt/prompts/" \
  -d '{"name":"enrollment-password-repeat","field_key":"password_repeat","label":"Confirm Password","type":"password","required":true,"placeholder":"Confirm Password","order":3}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

# Create prompt stage, user-write stage, user-login stage
PROMPT_STAGE=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/prompt/stages/" \
  -d "{\"name\":\"enrollment-prompt\",\"fields\":[\"${USERNAME_FIELD}\",\"${EMAIL_FIELD}\",\"${PASS_FIELD}\",\"${PASS_REPEAT}\"],\"validation_policies\":[]}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

USER_WRITE=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/user_write/" \
  -d '{"name":"enrollment-user-write","create_users_as_inactive":false}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

USER_LOGIN=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/user_login/" \
  -d '{"name":"enrollment-user-login"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

# Create enrollment flow and bind stages
ENROLL_FLOW=$(curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/flows/instances/" \
  -d '{"name":"Sign Up","slug":"default-enrollment-flow","title":"Create an account","designation":"enrollment","policy_engine_mode":"any"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['pk'])" 2>/dev/null)

curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/flows/bindings/" \
  -d "{\"target\":\"${ENROLL_FLOW}\",\"stage\":\"${PROMPT_STAGE}\",\"order\":10}" > /dev/null
curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/flows/bindings/" \
  -d "{\"target\":\"${ENROLL_FLOW}\",\"stage\":\"${USER_WRITE}\",\"order\":20}" > /dev/null
curl -sf -X POST -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/flows/bindings/" \
  -d "{\"target\":\"${ENROLL_FLOW}\",\"stage\":\"${USER_LOGIN}\",\"order\":30}" > /dev/null

# Link enrollment flow to the login page identification stage
IDENT_STAGE=$(curl -sf -H "${AUTH_HEADER}" "${API}/stages/identification/?search=default-authentication" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['pk'])" 2>/dev/null)

curl -sf -X PATCH -H "${AUTH_HEADER}" -H "Content-Type: application/json" \
  "${API}/stages/identification/${IDENT_STAGE}/" \
  -d "{\"user_fields\":[\"email\",\"username\"],\"enrollment_flow\":\"${ENROLL_FLOW}\"}" > /dev/null

if [ -n "$ENROLL_FLOW" ]; then
  echo "Enrollment flow created (sign-up link on login page)"
else
  echo "WARNING: Enrollment flow setup failed"
fi

# Verify OIDC discovery
echo "Verifying OIDC configuration..."
ISSUER=$(curl -sf "${AUTHENTIK_URL}/application/o/workout-app/.well-known/openid-configuration" | python3 -c "import sys,json; print(json.load(sys.stdin).get('issuer',''))" 2>/dev/null || echo "")

if [ -n "$ISSUER" ]; then
  echo "OIDC discovery OK. Issuer: ${ISSUER}"
else
  echo "WARNING: OIDC discovery endpoint not yet available (may take a moment)"
fi

echo "Authentik setup complete!"
