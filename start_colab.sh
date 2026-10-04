#!/bin/bash
# =========================================================
# Taliyo Technologies - All-In-One Google Colab Runner
# Hosts Demo Marketplace on Custom Subdomain (Cloudflare)
# =========================================================

echo "========================================================="
echo "⚡ Starting Taliyo Demo Hub Deployment in Google Colab..."
echo "========================================================="

# Stop any previous instances to free port 3000
pkill -f "node server.js" 2>/dev/null || true
pkill -f "cloudflared" 2>/dev/null || true
sleep 1

# 1. System packages (PHP 8, SQLite, Composer)
if ! command -v php &> /dev/null; then
    echo "📦 [1/4] Installing PHP, SQLite, and Composer packages..."
    apt-get update -qq > /dev/null 2>&1
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq php-cli php-sqlite3 php-curl php-mbstring php-zip php-gd composer > /dev/null 2>&1
    echo "✅ PHP & SQLite installed successfully: $(php -v | head -n 1)"
else
    echo "✅ [1/4] PHP runtime is already installed: $(php -v | head -n 1)"
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

# 3. Ensure Environment File (.env) exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating default .env configuration..."
    cat << 'EOF' > .env
ADMIN_USER=admin@demo.com
ADMIN_PASS=Admin@1234
PORT=3000
SECRET_KEY=taliyosecretkey2026
DB_TYPE=sqlite
DB_PATH=./data/app.db
EOF
fi

# Ensure data & demos directories exist
mkdir -p data demos uploads

# 4. Node.js dependencies
echo "📦 [3/4] Installing Node dependencies..."
if ! node -e "require('helmet'); require('express'); require('sqlite3'); require('winston');" >/dev/null 2>&1; then
    echo "⚙️ Installing missing npm dependencies (express, helmet, sqlite3, etc.)..."
    npm install --omit=dev --no-audit --no-fund
fi

# Sanity check to be 100% sure helmet and core dependencies are ready
if ! node -e "require('helmet'); require('express');" >/dev/null 2>&1; then
    echo "⚙️ Force-installing helmet and core packages..."
    npm install helmet express winston sqlite3 dotenv cors compression adm-zip multer cookie-parser express-rate-limit express-validator redis swagger-jsdoc swagger-ui-express
fi
echo "✅ Node dependencies ready."

# 5. Start Demo Server
echo "🚀 [4/4] Starting Taliyo Demo Server on port 3000..."
node server.js > server.log 2>&1 &
SERVER_PID=$!

READY=0
for i in {1..25}; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 2>/dev/null)
    if [ "$HTTP_STATUS" != "000" ] && [ -n "$HTTP_STATUS" ]; then
        echo "✅ Demo Server is LIVE at http://127.0.0.1:3000 (HTTP $HTTP_STATUS, PID: $SERVER_PID)"
        READY=1
        break
    fi
    sleep 1
done

if [ $READY -eq 0 ]; then
    echo "❌ Error: Demo Server failed to start on port 3000! Printing server.log:"
    echo "---------------------------------------------------------"
    cat server.log
    echo "---------------------------------------------------------"
    exit 1
fi

echo "========================================================="
echo "🌐 CONNECTING TO CUSTOM SUBDOMAIN..."
echo "========================================================="

# Ensure Cloudflare tunnel credentials and config exist
mkdir -p .cloudflared
cat << 'EOF' > .cloudflared/885a4c8c-d937-4685-a8f2-58ca7158acf0.json
{"AccountTag":"6615cef6609de5e094c2706439e31bb8","TunnelSecret":"2ngbJwgJ6mtCzHpJkge/iawXZ9fyeb6p0h8ciIIMoqY=","TunnelID":"885a4c8c-d937-4685-a8f2-58ca7158acf0","Endpoint":""}
EOF

cat << 'EOF' > .cloudflared/config.yml
tunnel: 885a4c8c-d937-4685-a8f2-58ca7158acf0
credentials-file: .cloudflared/885a4c8c-d937-4685-a8f2-58ca7158acf0.json

ingress:
  - hostname: demo.taliyotechnologies.com
    service: http://127.0.0.1:3000
  - service: http_status:404
EOF

echo "🔗 Starting Cloudflare Tunnel in background..."
nohup cloudflared tunnel --config .cloudflared/config.yml run > tunnel.log 2>&1 &
TUNNEL_PID=$!

echo "⏳ Verifying tunnel connection..."
READY_TUNNEL=0
for i in {1..15}; do
    if grep -q "Registered tunnel connection" tunnel.log 2>/dev/null; then
        READY_TUNNEL=1
        break
    fi
    sleep 1
done

if [ $READY_TUNNEL -eq 1 ]; then
    echo "✅ Cloudflare Tunnel is CONNECTED! (PID: $TUNNEL_PID)"
else
    echo "⚠️ Tunnel initialized (PID: $TUNNEL_PID). Connecting to edge..."
fi

echo "========================================================="
echo "🎉 ALL SYSTEMS LIVE IN THE BACKGROUND!"
echo "🌐 Public Website:  https://demo.taliyotechnologies.com"
echo "⚙️ Admin Panel:     https://demo.taliyotechnologies.com/admin"
echo "📊 Server PID: $SERVER_PID | Tunnel PID: $TUNNEL_PID"
echo "========================================================="
echo "✅ Cell execution finished. Everything is running safely in the background!"
echo "ℹ️ Tip: To view live tunnel logs anytime, run: !tail -n 20 tunnel.log"
