# Taliyo Demo Hub

A premium demo hosting platform for showcasing websites and web applications.

## 🚀 Features

### Admin Dashboard
- **Premium Dark UI** - Modern glassmorphism design with SVG icons
- **Upload Demos** - Support for both ZIP files and folder uploads
- **Smart Link Generator** - Create shareable links with return URL tracking
- **Demo Management** - Start, stop, rename, delete demos
- **Config Editor** - Set environment variables per demo
- **Custom URLs** - Override entry points for each demo
- **Search & Filter** - Quickly find demos in large collections
- **Mobile Responsive** - Works on all screen sizes

### Demo Types Support
| Type | Auto Detection | Features |
|------|----------------|----------|
| **Static Sites** | `index.html` | Served directly |
| **Node.js Apps** | `package.json` with `express/koa/fastify` | Auto port allocation |
| **Next.js Apps** | `package.json` with `next` | Dev server management |

### Security
- Cookie-based authentication
- Protected API endpoints
- Restricted file/folder deletion
- Directory traversal prevention

## 📦 Installation

```bash
# Clone repository
git clone <repo-url>
cd demo-website

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start server
npm start
```

## ⚙️ Configuration

Create a `.env` file:

```env
ADMIN_USER=admin
ADMIN_PASS=your_secure_password
SECRET_KEY=your_random_secret_key
PORT=3000
```

## 🔗 API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/demos` | List all demos (public) |

### Protected (Requires Auth)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Admin login |
| POST | `/api/logout` | Admin logout |
| GET | `/api/demos` | List demos with details |
| POST | `/api/upload` | Upload demo (ZIP) |
| POST | `/api/delete` | Delete demo |
| POST | `/api/rename` | Rename demo |
| GET | `/api/config/:name` | Get demo config |
| POST | `/api/config/:name` | Update demo config |
| POST | `/api/demo/start/:name` | Start server demo |
| POST | `/api/demo/stop/:name` | Stop server demo |
| GET | `/api/demo/status/:name` | Get demo status |
| GET | `/api/demo/running` | List running demos |

## 📁 Project Structure

```
demo-website/
├── admin/
│   ├── dashboard.html    # Admin panel
│   └── login.html        # Login page
├── lib/
│   └── demoManager.js    # Demo process manager
├── common/               # Shared assets
├── uploads/              # Temp upload directory
├── [demo-folders]/       # Uploaded demos
├── server.js             # Main server
├── index.html            # Landing page
├── package.json
└── .env
```

## 🎨 Demo Configuration

Each demo can have a `.config.json` file:

```json
{
  "customUrl": "login.html",
  "API_KEY": "your-api-key",
  "DATABASE_URL": "..."
}
```

- `customUrl` - Override the entry point URL
- Other keys are passed as environment variables to server demos

## 🔄 Back Button

All demo pages automatically get a floating "Back" button that:
- Reads `?return=` parameter from URL
- Falls back to landing page if not set
- Excluded from admin and landing pages

## 📱 Mobile Support

The dashboard is fully responsive with:
- Collapsible navigation
- Touch-friendly buttons
- Adaptive grid layouts
- Optimized modals

## 🛠️ Production Deployment

### Recommended Setup

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "demo-hub"

# Enable startup
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name demos.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📝 License

© Taliyo Technologies - All Rights Reserved

---

**Built with ❤️ by Taliyo Technologies**
