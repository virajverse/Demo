# 🚀 Taliyo Demo Hosting System

A powerful, self-hosted platform for managing and hosting multiple demo websites with environment configuration support.

## Features

- ✅ **Secure Admin Panel** - Login with credentials from `.env`
- 📦 **Drag & Drop Upload** - Upload `.zip` files to instantly host demos
- 🔗 **Smart Link Generator** - Create shareable links with automatic back-button redirect
- ⚙️ **Environment Config** - Manage key-value pairs for each demo (like `.env` but per-demo)
- 🗑️ **Easy Management** - Delete demos with one click

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Admin Credentials
Edit `.env` file:
```env
ADMIN_USER=admin
ADMIN_pass=your_password
PORT=3000
SECRET_KEY=your_secret_key
```

### 3. Start Server
```bash
npm start
```

### 4. Access Admin Panel
Open: `http://localhost:3000/admin`

Login with credentials from `.env`

---

## How to Use Config System in Your Demos

### Step 1: Set Config in Admin Panel

1. Go to Admin Dashboard
2. Click **"Config"** button on any demo card
3. Add key-value pairs:
   - Example: `API_KEY` = `abc123xyz`
   - Example: `THEME_COLOR` = `#6366f1`
   - Example: `CONTACT_EMAIL` = `demo@example.com`
4. Click **"Save Config"**

### Step 2: Include Config Script in Your Demo

Add this to your demo's `index.html` **before** other scripts:

```html
<script src="../common/config.js"></script>
```

### Step 3: Access Config in Your Code

**Method 1: Using the API**
```javascript
// Wait for config to load
window.addEventListener('taliyoConfigLoaded', (event) => {
    const config = event.detail;
    console.log('API Key:', config.API_KEY);
    console.log('Theme:', config.THEME_COLOR);
});
```

**Method 2: Direct Access (async)**
```javascript
// Load config first
await TaliyoConfig.load();

// Get specific value
const apiKey = TaliyoConfig.get('API_KEY');
const email = TaliyoConfig.get('CONTACT_EMAIL', 'default@example.com');

// Get all config
const allConfig = TaliyoConfig.getAll();
console.log(allConfig);
```

**Method 3: Simple Usage**
```javascript
// Config auto-loads on page load
setTimeout(() => {
    const theme = TaliyoConfig.get('THEME_COLOR');
    document.body.style.setProperty('--primary-color', theme);
}, 500);
```

### Full Example

**Admin Panel Config:**
```
API_URL = https://api.example.com
BRAND_NAME = Acme Corp
PRIMARY_COLOR = #6366f1
CONTACT_EMAIL = support@acme.com
```

**Demo Code (`index.html`):**
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Demo</title>
    <script src="../common/config.js"></script>
</head>
<body>
    <h1 id="brandName">Loading...</h1>
    <p id="contact"></p>

    <script>
        // Wait for config to load
        window.addEventListener('taliyoConfigLoaded', (e) => {
            const config = e.detail;
            
            document.getElementById('brandName').textContent = config.BRAND_NAME;
            document.getElementById('contact').textContent = 
                `Contact: ${config.CONTACT_EMAIL}`;
            
            document.documentElement.style.setProperty(
                '--primary', 
                config.PRIMARY_COLOR
            );
        });
    </script>
</body>
</html>
```

---

## Config Storage

- Each demo's config is stored in a `.config.json` file inside its folder
- Example: `MyDemo/.config.json`
- Config is **public** (anyone can read it via API)
- **Don't store sensitive secrets** - use server-side `.env` for that

---

## Smart Link with Return URL

### Usage in Admin Panel:
1. Select a demo
2. Enter your main site URL (e.g., `https://taliyotechnologies.com`)
3. Copy generated link

**Example Generated Link:**
```
http://localhost:3000/MyDemo/index.html?return=https://taliyotechnologies.com
```

When users click the **Back Button** on the demo, they'll return to your main site instead of browser history.

---

## Folder Structure

```
Demo Website/
├── admin/                  # Admin panel files
│   ├── login.html
│   └── dashboard.html
├── common/                 # Shared scripts
│   ├── redirect.js        # Back button logic
│   └── config.js          # Config helper
├── MyDemo/                # Your uploaded demo
│   ├── index.html
│   ├── style.css
│   └── .config.json       # Auto-generated config
├── .env                   # Admin credentials (server-side)
├── server.js              # Backend server
└── package.json
```

---

## API Reference

### Get Demo Config
```
GET /api/config/:demoName
```

Response:
```json
{
  "config": {
    "API_KEY": "abc123",
    "THEME_COLOR": "#6366f1"
  }
}
```

### Update Demo Config (Admin Only)
```
POST /api/config/:demoName
Content-Type: application/json

{
  "config": {
    "API_KEY": "new_value",
    "THEME_COLOR": "#ff0000"
  }
}
```

---

## Security Notes

1. **Admin credentials** are stored in `.env` (server-side, secure)
2. **Demo configs** are stored in `.config.json` (client-accessible)
3. Never put passwords/API secrets in demo config
4. Use demo config for: branding, URLs, colors, public settings

---

## Deployment Tips

### For Production:
1. Change `.env` credentials
2. Use HTTPS
3. Set `SECRET_KEY` to a random string
4. Deploy to platforms like:
   - Vercel (needs adaptation)
   - Railway
   - Render
   - Your own VPS

---

## Troubleshooting

**Config not loading?**
- Make sure `config.js` is included before other scripts
- Check browser console for errors
- Verify demo name matches folder name

**Can't save config?**
- Ensure you're logged in as admin
- Check server logs for errors

**Upload not working?**
- Only `.zip` files are allowed
- Ensure zip has a folder structure (not direct files)

---

## Support

For issues or questions:
- Email: contact@taliyotech.com
- Website: https://taliyotechnologies.com

---

Built with ❤️ by Taliyo Technologies
