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

READY=0
for i in {1..20}; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 2>/dev/null)
    if [ "$HTTP_STATUS" != "000" ] && [ -n "$HTTP_STATUS" ]; then
        echo "✅ Demo Server is LIVE at http://127.0.0.1:3000 (HTTP $HTTP_STATUS, PID: $SERVER_PID)"
        READY=1
        break
    fi
    sleep 1
done

if [ $READY -eq 0 ]; then
    echo "⚠️ Server taking time to respond. Log preview:"
    tail -n 15 server.log 2>/dev/null
fi

echo "========================================================="
echo "🌐 CONNECTING TO CUSTOM SUBDOMAIN..."
echo "========================================================="

# Priority 1: Cloudflare Tunnel with Credentials config.yml
if [ -f ".cloudflared/config.yml" ] && [ -f ".cloudflared/885a4c8c-d937-4685-a8f2-58ca7158acf0.json" ]; then
    echo "🔗 Connecting to https://demo.taliyotechnologies.com via Cloudflare..."
    cloudflared tunnel --config .cloudflared/config.yml run
# Priority 2: Cloudflare Tunnel with Token for taliyo-demos (885a4c8c)
else
    echo "🔗 Connecting to https://demo.taliyotechnologies.com using taliyo-demos token..."
    cloudflared tunnel run --token "eyJhIjoiNjYxNWNlZjY2MDlkZTVlMDk0YzI3MDY0MzllMzFiYjgiLCJzIjoiMm5nYkp3Z0o2bXRDekhwSmtnZS9pYXdYWjlmeWViNnAwaDhjaUlJTW9xWT0iLCJ0IjoiODg1YTRjOGMtZDkzNy00Njg1LWE4ZjItNThjYTcxNThhY2YwIn0="
fi
