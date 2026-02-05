#!/usr/bin/env bash
# Claude Code PostToolUse hook
# Tool outputs are NOT sent to Discord - only Stop hook sends final response
# This hook exists only to return approval response

cat << 'EOF'
{"decision": "approve", "reason": "OK"}
EOF
