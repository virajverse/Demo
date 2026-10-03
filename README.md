# ⚡ Taliyo Marketplace Demo Hub

> **Self-hosted Demo Deployment & Preview Platform** by **Taliyo Technologies**  
> Easily upload, host, showcase, and manage multiple web demos (Static HTML, Node.js, Next.js) with zero DevOps overhead.

---

## 🌟 Key Features

* 🚀 **Vercel-like One-Click Upload**: Upload `.zip` archives of full websites or web apps via drag-and-drop.
* 🔍 **Auto Framework Detection**: Automatically detects Static Sites, Node.js, Next.js, and Standalone apps.
* ⚡ **Dynamic Port Allocation**: Launches server-based applications on isolated ports (4000+) automatically.
* 🔄 **Reverse Proxy & Clean Routing**: Route requests seamlessly to running applications with automatic asset handling.
* 🔙 **Smart Back-Button Injection**: Automatically injects a floating return button into demo pages so users can easily return to the marketplace gallery.
* 🔒 **Built-in Security Firewall**: Prevents access to server configs, `.env` files, databases, and source code.
* 📊 **Admin Dashboard & Health Monitoring**: Start, stop, delete, rename, and monitor live status of demos in real-time.
* 📖 **Interactive API Documentation**: Full Swagger UI documentation at `/api-docs`.

---

## 📂 Project Structure

```
Demo Website/
├── admin/
│   ├── dashboard.html    # Full Admin Dashboard (Upload, start/stop, manage demos)
│   └── login.html        # Admin Authentication page
├── data/
│   └── users.json        # User and deployment storage
├── database/             # SQLite migrations and schema
├── lib/
│   ├── analyticsManager.js  # Traffic and event metrics
│   ├── auditManager.js      # Security and action audit trail
│   ├── crmManager.js        # Lead tracking
│   ├── crypto.js            # Password hashing & verification
│   ├── db.js                # SQLite database interface
│   ├── demoManager.js       # Process lifecycle & port manager
│   ├── deployManager.js     # Deployment records & logs
│   ├── domainManager.js     # Custom domain routing
│   ├── envManager.js        # Environment variable editor
│   ├── fileSystem.js        # Safe file I/O helpers
│   ├── healthMonitor.js     # Uptime and auto-recovery checks
│   ├── userManager.js       # User accounts & sessions
│   ├── versionManager.js    # Versioning & rollbacks
│   ├── webhookManager.js    # GitHub webhooks
│   └── worker.js            # Background maintenance jobs
├── uploads/                 # Temporary upload buffer
├── index.html               # Main Landing Page (Taliyo Technologies Live)
├── server.js                # Core Express Server & Reverse Proxy
├── package.json             # Node.js dependencies & scripts
├── .env                     # Configuration and secrets
└── cloudflare-config.yml    # Cloudflare Tunnel configuration
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```ini
ADMIN_USER=admin@demo.com
ADMIN_PASS=Admin@1234
PORT=3000
SECRET_KEY=taliyosecretkey2026
DB_TYPE=sqlite
DB_PATH=./data/app.db
```

### 3. Start Server
```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

---

## 🌐 Routes & Endpoints

| Route | Description |
|---|---|
| `GET /` | Public Landing Page (Taliyo Technologies Live) |
| `GET /admin/login.html` | Admin Login Page |
| `GET /admin/dashboard.html` | Admin Management Dashboard |
| `GET /api-docs` | Interactive Swagger API Documentation |
| `POST /api/upload` | Upload & extract demo zip file |
| `GET /api/demos` | List all available demos |
| `POST /api/demo/start/:name` | Launch dynamic demo process |
| `POST /api/demo/stop/:name` | Terminate dynamic demo process |
| `POST /api/delete` | Remove demo directory safely |

---

## 🔒 Security Best Practices
* **Child Process Isolation**: Uploaded projects run with stripped environment variables to avoid leaking host credentials.
* **Access Control**: Core files (`.env`, `*.json`, `*.db`, `server.js`) are blocked by security middleware against unauthorized public downloads.
* **Reserved Namespace Protection**: Uploads cannot overwrite system directories (`lib`, `database`, `admin`, etc.).

---

© **Taliyo Technologies**. All rights reserved.
