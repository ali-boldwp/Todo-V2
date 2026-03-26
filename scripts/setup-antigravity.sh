#!/usr/bin/env bash
# =============================================================================
# Todo V2 – Linux Server Setup Script
# Sets up Antigravity (OpenCode) for repo-aware AI task planning
# =============================================================================
set -e

# ─── Config ──────────────────────────────────────────────────────────────────
REPOS_ROOT="/var/devmanager/repos"
OPENCODE_PORT="5001"
API_USER="www-data"

echo "=== Todo V2 – Antigravity Server Setup ==="
echo ""

# ─── 1. System packages ────────────────────────────────────────────────────
echo "[1/6] Installing system dependencies..."
apt-get update -qq
apt-get install -y git curl

# ─── 2. Install OpenCode (Antigravity) ─────────────────────────────────────
echo "[2/6] Installing Antigravity (opencode)..."
npm install -g opencode-ai
echo "  ✓ opencode version: $(opencode --version)"

# ─── 3. Repos directory ────────────────────────────────────────────────────
echo "[3/6] Creating repos directory at $REPOS_ROOT..."
mkdir -p "$REPOS_ROOT"
chown "$API_USER:$API_USER" "$REPOS_ROOT"
echo "  ✓ $REPOS_ROOT created"

# ─── 4. Configure AI provider ──────────────────────────────────────────────
echo "[4/6] Configuring AI provider..."

CONFIG_DIR="$HOME/.config/opencode"
mkdir -p "$CONFIG_DIR"

if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo ""
    echo "  ⚠  No AI provider API key found in environment."
    echo "  Set one of the following in your .env or shell BEFORE running this script:"
    echo ""
    echo "    export ANTHROPIC_API_KEY=sk-ant-..."
    echo "    export GOOGLE_API_KEY=AIza..."
    echo ""
    echo "  You can also configure it manually after setup:"
    echo "    Edit $CONFIG_DIR/config.json"
    echo ""
fi

# Write config based on available key
if [ -n "$ANTHROPIC_API_KEY" ]; then
    cat > "$CONFIG_DIR/config.json" <<EOF
{
  "providers": {
    "anthropic": {
      "api_key": "$ANTHROPIC_API_KEY"
    }
  },
  "model": "anthropic:claude-sonnet-4-5"
}
EOF
    echo "  ✓ Configured Anthropic Claude"
elif [ -n "$GOOGLE_API_KEY" ]; then
    cat > "$CONFIG_DIR/config.json" <<EOF
{
  "providers": {
    "google": {
      "api_key": "$GOOGLE_API_KEY"
    }
  },
  "model": "google:gemini-2.0-flash"
}
EOF
    echo "  ✓ Configured Google Gemini"
else
    echo "  ⚠  Skipped (no keys). Configure manually at $CONFIG_DIR/config.json"
fi

# ─── 5. Systemd service for global OpenCode server ─────────────────────────
echo "[5/6] Creating systemd service for global Antigravity server..."

cat > /etc/systemd/system/opencode.service <<EOF
[Unit]
Description=Antigravity (OpenCode) Global AI Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$REPOS_ROOT
ExecStart=$(which opencode) serve --port $OPENCODE_PORT
Restart=always
RestartSec=5
Environment=HOME=$HOME

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable opencode
systemctl start opencode
sleep 2

if systemctl is-active --quiet opencode; then
    echo "  ✓ Antigravity global server running on port $OPENCODE_PORT"
else
    echo "  ✗ Service failed to start. Check: journalctl -u opencode -n 20"
fi

# ─── 6. Environment variables reminder ─────────────────────────────────────
echo "[6/6] Environment variables to add to your API .env file:"
echo ""
echo "  # Antigravity"
echo "  OPENCODE_URL=http://localhost:$OPENCODE_PORT"
echo "  REPOS_ROOT=$REPOS_ROOT"
echo "  OPENCODE_BASE_PORT=5010"
echo ""
echo "====================================================="
echo " Setup complete!"
echo ""
echo " Next steps:"
echo " 1. Add the env vars above to apps/api/.env"
echo " 2. Deploy and start the Todo V2 API"
echo " 3. In Todo V2 admin, link a GitHub repo to a project"
echo " 4. Call POST /api/projects/:id/setup-repo to clone it"
echo " 5. Use the task chatbot — Antigravity will plan using"
echo "    the real codebase!"
echo "====================================================="
