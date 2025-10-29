#!/bin/sh
set -eu

CONFIG_DIR=/usr/share/nginx/html
TEMPLATE_PATH="$CONFIG_DIR/config.template.js"
OUTPUT_PATH="$CONFIG_DIR/config.js"

if [ ! -f "$TEMPLATE_PATH" ]; then
  echo "Runtime config template not found at $TEMPLATE_PATH; skipping generation."
  exit 0
fi

export SUPABASE_URL="${SUPABASE_URL:-}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

envsubst < "$TEMPLATE_PATH" > "$OUTPUT_PATH"
echo "Runtime config generated at $OUTPUT_PATH"
