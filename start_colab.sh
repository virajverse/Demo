#!/bin/bash
# =========================================================
# Taliyo Technologies - All-In-One Google Colab Runner
# Hosts Demo Marketplace on Custom Subdomain (Cloudflare / Localtunnel)
# =========================================================

echo "========================================================="
echo "⚡ Starting Taliyo Demo Hub Deployment in Google Colab..."
echo "========================================================="

# 1. System packages (PHP 8, SQLite, Composer)
if ! command -v php &> /dev/null; then
    echo "📦 [1/4] Installing PHP, SQLite, and Composer packages..."
    apt-get update -qq > /dev/null 2>&1
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq php-cli php-sqlite3 php-curl php-mbstring php-zip php-gd composer > /dev/null 2>&1
    echo "✅ PHP & SQLite installed successfully: $(php -v | head -n 1)"
else
    echo "✅ [1/4] PHP runtime is already installed."
fi

# 2. Install Cloudflared binary
if ! command -v cloudflared &> /dev/null; then
    echo "📦 [2/4] Installing Cloudflare Tunnel (cloudflared)..."
    wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb > /dev/null 2>&1
    rm -f cloudflared-linux-amd64.deb
    echo "✅ Cloudflared installed successfully."
else
    echo "✅ [2/4] Cloudflared is already installed."
fi

# 3. Node.js dependencies
echo "📦 [3/4] Installing Node dependencies..."
npm install --omit=dev --no-audit --no-fund > /dev/null 2>&1
echo "✅ Node dependencies ready."

# 4. Start Demo Server
echo "🚀 [4/4] Starting Taliyo Demo Server on port 3000..."
node server.js > server.log 2>&1 &
SERVER_PID=$!
sleep 3

# Verify server is responding
if curl -s http://127.0.0.1:3000 > /dev/null; then
    echo "✅ Demo Server is LIVE at http://127.0.0.1:3000 (PID: $SERVER_PID)"
else
    echo "⚠️ Waiting for server to initialize..."
    sleep 2
fi

echo "========================================================="
echo "🌐 CONNECTING TO CUSTOM SUBDOMAIN..."
echo "========================================================="

# Priority 1: Cloudflare Tunnel with Credentials config.yml
if [ -f ".cloudflared/config.yml" ] && [ -f ".cloudflared/b4747fcf-4b2a-4bf1-af94-76e7969a214f.json" ]; then
    echo "🔗 Connecting to https://demo.taliyotechnologies.com via Cloudflare..."
    cloudflared tunnel --config .cloudflared/config.yml run
# Priority 2: Cloudflare Tunnel with CF_TOKEN env variable
elif [ -n "$CF_TOKEN" ]; then
    echo "🔗 Connecting to Cloudflare using CF_TOKEN..."
    cloudflared tunnel run --token "$CF_TOKEN"
# Priority 3: Quick Cloudflare Tunnel (Free SSL, Instant Domain)
else
    echo "🔗 Launching Free Cloudflare Tunnel (Instant SSL)..."
    cloudflared tunnel --url http://localhost:3000
fi
