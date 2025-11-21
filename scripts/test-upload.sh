#!/bin/bash
# Test replay upload against localhost or production
# Usage: ./scripts/test-upload.sh [local|prod]

ENV=${1:-local}
REPLAY_FILE=${2:-/tmp/test.SC2Replay}

# Validate environment
if [[ "$ENV" != "local" && "$ENV" != "prod" ]]; then
  echo "❌ Error: Environment must be 'local' or 'prod'"
  exit 1
fi

# Validate replay file exists
if [[ ! -f "$REPLAY_FILE" ]]; then
  echo "❌ Error: Replay file not found: $REPLAY_FILE"
  exit 1
fi

# Generate token
echo "🔑 Generating $ENV token..."
TOKEN=$(node scripts/generate-token.mjs $ENV | grep "^eyJ" | head -1 | tr -d '[:space:]')

# Determine API URL
if [[ "$ENV" == "local" ]]; then
  API_URL="http://localhost:3000"
else
  API_URL="https://www.ladderlegendsacademy.com"
fi

echo "📤 Testing upload to $API_URL..."
echo ""

# Execute test
curl -v -X POST "$API_URL/api/my-replays" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$REPLAY_FILE" \
  2>&1

echo ""
echo "✅ Test complete"
