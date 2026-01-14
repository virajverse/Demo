# 🚀 Smart Inquiry Capture - Backend Setup Guide

## 📋 Overview

यह MVP 2 (Business Tier) का backend है। इसमें शामिल है:
- ✅ Node.js + Express REST API
- ✅ PostgreSQL Database
- ✅ JWT Authentication
- ✅ WhatsApp Cloud API Integration
- ✅ Email & SMS Notifications
- ✅ Multi-Staff Scheduling
- ✅ CRM Webhook Integration

---

## 🛠️ Prerequisites

### Required Software:

1. **Node.js** (v18 या उससे ऊपर)
   - Download: https://nodejs.org/
   - Check version: `node --version`

2. **PostgreSQL** (v14 या उससे ऊपर)
   - Download: https://www.postgresql.org/download/
   - Check version: `psql --version`

3. **npm** (Node.js के साथ आता है)
   - Check version: `npm --version`

---

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

यह सभी required packages install करेगा:
- express (Web framework)
- pg (PostgreSQL client)
- bcryptjs (Password hashing)
- jsonwebtoken (JWT authentication)
- nodemailer (Email sending)
- axios (HTTP requests)
- और बहुत कुछ...

---

### Step 2: Setup Database

#### 2.1 Create Database

PostgreSQL में login करें:
```bash
psql -U postgres
```

Database बनाएं:
```sql
CREATE DATABASE smart_inquiry;
```

Database में switch करें:
```sql
\c smart_inquiry
```

Exit करें:
```sql
\q
```

#### 2.2 Run Schema

Database schema create करें:
```bash
psql -U postgres -d smart_inquiry -f ../database/schema.sql
```

✅ यह सभी tables, indexes, और default settings create कर देगा।

---

### Step 3: Configure Environment Variables

#### 3.1 Create .env File

```bash
cp .env.example .env
```

#### 3.2 Edit .env File

अपनी actual values भरें:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_inquiry
DB_USER=postgres
DB_PASSWORD=your_actual_password

# JWT
JWT_SECRET=your_super_secret_key_here

# Admin (Initial)
DEFAULT_ADMIN_EMAIL=admin@taliyotech.com
DEFAULT_ADMIN_PASSWORD=YourStrongPassword123!
```

**Important:** 
- `JWT_SECRET` को एक strong random string से replace करें
- `DB_PASSWORD` अपना PostgreSQL password डालें
- `DEFAULT_ADMIN_PASSWORD` को एक secure password से बदलें

---

### Step 4: Test Database Connection

```bash
npm run dev
```

आपको यह दिखना चाहिए:
```
✅ Database connected successfully
📊 Database time: 2026-01-12 03:00:00
🚀 Server running on port 5000
```

अगर error आए तो:
1. Check करें कि PostgreSQL running है
2. Database credentials सही हैं
3. Database `smart_inquiry` exist करता है

---

## 🧪 Testing the API

### Health Check

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-01-12T03:00:00.000Z",
  "environment": "development",
  "version": "2.0.0"
}
```

### API Documentation

Visit: `http://localhost:5000/`

यह सभी available endpoints की list दिखाएगा।

---

## 📁 Project Structure

```
backend/
├── server.js                 # Main server file
├── package.json             # Dependencies
├── .env.example             # Environment template
├── .env                     # Your actual config (gitignored)
│
├── config/
│   └── database.js          # Database configuration
│
├── routes/                  # API routes (to be created)
│   ├── auth.js
│   ├── bookings.js
│   ├── staff.js
│   └── ...
│
├── controllers/             # Business logic (to be created)
│   ├── authController.js
│   ├── bookingController.js
│   └── ...
│
├── models/                  # Database models (to be created)
│   ├── User.js
│   ├── Booking.js
│   └── ...
│
├── middleware/              # Custom middleware (to be created)
│   ├── auth.js
│   └── validation.js
│
└── services/                # External services (to be created)
    ├── whatsappService.js
    ├── emailService.js
    └── ...
```

---

## 🔧 Development Commands

### Start Development Server (with auto-reload)
```bash
npm run dev
```

### Start Production Server
```bash
npm start
```

### Check for Errors
```bash
npm test
```

---

## 🗄️ Database Management

### View All Tables
```bash
psql -U postgres -d smart_inquiry -c "\dt"
```

### View Table Structure
```bash
psql -U postgres -d smart_inquiry -c "\d bookings"
```

### Run SQL Query
```bash
psql -U postgres -d smart_inquiry -c "SELECT * FROM users;"
```

### Backup Database
```bash
pg_dump -U postgres smart_inquiry > backup.sql
```

### Restore Database
```bash
psql -U postgres smart_inquiry < backup.sql
```

---

## 🔐 Security Checklist

### Before Production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Change `DEFAULT_ADMIN_PASSWORD` 
- [ ] Enable HTTPS/SSL
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Setup database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Review all environment variables
- [ ] Remove debug logs

---

## 🚨 Common Issues & Solutions

### Issue 1: "Database connection failed"

**Solution:**
1. Check PostgreSQL is running:
   ```bash
   # Windows
   services.msc (look for PostgreSQL)
   
   # Mac/Linux
   sudo service postgresql status
   ```

2. Verify credentials in `.env`
3. Check database exists:
   ```bash
   psql -U postgres -l
   ```

### Issue 2: "Port 5000 already in use"

**Solution:**
Change port in `.env`:
```env
PORT=5001
```

### Issue 3: "Module not found"

**Solution:**
```bash
rm -rf node_modules
npm install
```

### Issue 4: "Permission denied" (PostgreSQL)

**Solution:**
```bash
# Grant permissions
psql -U postgres -d smart_inquiry -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;"
```

---

## 📊 Database Schema Overview

### Tables Created:

1. **users** - Admin & Staff accounts
2. **staff** - Staff member details
3. **availability** - Staff availability rules
4. **bookings** - All booking records
5. **settings** - System settings
6. **notifications** - Notification log

### Key Relationships:

```
users (1) ──→ (1) staff
staff (1) ──→ (many) availability
staff (1) ──→ (many) bookings
bookings (1) ──→ (many) notifications
```

---

## 🔌 External Integrations Setup

### WhatsApp Cloud API

1. Create Meta Business Account: https://business.facebook.com/
2. Create App: https://developers.facebook.com/apps
3. Add WhatsApp product
4. Get Phone Number ID and Access Token
5. Update `.env`:
   ```env
   WHATSAPP_CLOUD_API_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
   ```

### Email (Gmail SMTP)

1. Enable 2-Factor Authentication
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `.env`:
   ```env
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_app_password
   ```

### SMS (MSG91)

1. Create account: https://msg91.com/
2. Get API key
3. Update `.env`:
   ```env
   MSG91_API_KEY=your_api_key
   ```

---

## 📈 Next Steps

### Phase 2: Create API Routes

अब हम बनाएंगे:
1. Authentication routes (`/api/auth`)
2. Booking routes (`/api/bookings`)
3. Staff routes (`/api/staff`)
4. Availability routes (`/api/availability`)
5. Analytics routes (`/api/analytics`)

### Phase 3: Admin Dashboard

Frontend admin panel बनाएंगे:
- Login page
- Dashboard
- Booking management
- Staff management
- Settings

---

## 📞 Support

अगर कोई problem आए तो:
1. Check logs में error message
2. Verify all environment variables
3. Test database connection
4. Check PostgreSQL is running

---

## ✅ Verification Checklist

Setup complete होने के बाद verify करें:

- [ ] `npm install` successfully completed
- [ ] Database `smart_inquiry` created
- [ ] Schema file executed without errors
- [ ] `.env` file configured
- [ ] Server starts without errors
- [ ] Health check returns OK
- [ ] Database connection successful
- [ ] All 6 tables exist in database

---

**Backend Setup Complete! 🎉**

अब आप API routes और controllers बना सकते हैं।

Next: Create authentication system और booking APIs!
