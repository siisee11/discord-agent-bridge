#!/usr/bin/env bash
# Claude Code PostToolUse hook
# Forwards tool outputs to Discord via the bridge HTTP server

set -euo pipefail

# Configuration
BRIDGE_PORT="${AGENT_DISCORD_PORT:-18470}"
PROJECT_NAME="${AGENT_DISCORD_PROJECT:-}"

# Debug logging
echo "[claude-hook] PORT=$BRIDGE_PORT PROJ=$PROJECT_NAME" >> /tmp/claude-hook-debug.log

# Read hook input from stdin
HOOK_INPUT=$(cat)

echo "[claude-hook] FULL_INPUT=$HOOK_INPUT" >> /tmp/claude-hook-full.log

# Only forward if project is configured
if [[ -n "$PROJECT_NAME" ]]; then
  # Send to bridge server (fire and forget, don't block Claude)
  CURL_RESULT=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$HOOK_INPUT" \
    "http://127.0.0.1:${BRIDGE_PORT}/hook/${PROJECT_NAME}/claude" \
    --max-time 2 2>&1 || echo "CURL_FAILED:$?")
  echo "[claude-hook] CURL: $CURL_RESULT" >> /tmp/claude-hook-debug.log
fi

# Return success response for Claude Code
cat << 'EOF'
{"decision": "approve", "reason": "Hook processed"}
EOF
