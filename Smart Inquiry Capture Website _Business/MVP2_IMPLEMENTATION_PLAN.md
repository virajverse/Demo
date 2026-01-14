# 🚀 MVP 2 - Business Tier Implementation Plan

## 📋 Overview

यह document MVP 2 (Business tier) के complete implementation के लिए है। यह MVP 1 के ऊपर build होगा।

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Existing)                      │
│  - index.html (Landing Page)                                │
│  - booking.html (Booking Flow)                              │
│  - Password Gate + Protection                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   NEW: ADMIN DASHBOARD                       │
│  - admin/login.html                                         │
│  - admin/dashboard.html                                     │
│  - admin/bookings.html                                      │
│  - admin/staff.html                                         │
│  - admin/settings.html                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                 │
│  - API Routes                                               │
│  - Authentication                                           │
│  - Business Logic                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                   │
│  - Users (Admin/Staff)                                      │
│  - Bookings                                                 │
│  - Staff Availability                                       │
│  - Settings                                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                      │
│  - WhatsApp Cloud API (Meta)                                │
│  - SMS Provider (MSG91/Twilio)                              │
│  - Email Service (SMTP/SendGrid)                            │
│  - Google Calendar API                                      │
│  - Outlook Calendar API                                     │
│  - CRM Webhook                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Complete File Structure

```
New folder/
├── 📄 Frontend (Existing - MVP 1)
│   ├── index.html
│   ├── booking.html
│   ├── styles.css
│   ├── script.js
│   ├── booking.js
│   ├── protection.js
│   ├── password-gate.js
│   └── README.md
│
├── 📁 admin/ (NEW - Admin Dashboard)
│   ├── login.html
│   ├── dashboard.html
│   ├── bookings.html
│   ├── staff.html
│   ├── settings.html
│   ├── analytics.html
│   ├── admin-styles.css
│   └── admin-script.js
│
├── 📁 backend/ (NEW - Node.js Backend)
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   │
│   ├── 📁 config/
│   │   ├── database.js
│   │   ├── whatsapp.js
│   │   ├── sms.js
│   │   └── email.js
│   │
│   ├── 📁 routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── staff.js
│   │   ├── availability.js
│   │   ├── webhooks.js
│   │   └── analytics.js
│   │
│   ├── 📁 controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── staffController.js
│   │   ├── availabilityController.js
│   │   └── analyticsController.js
│   │
│   ├── 📁 models/
│   │   ├── User.js
│   │   ├── Booking.js
│   │   ├── Staff.js
│   │   ├── Availability.js
│   │   └── Settings.js
│   │
│   ├── 📁 middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   │
│   ├── 📁 services/
│   │   ├── whatsappService.js
│   │   ├── smsService.js
│   │   ├── emailService.js
│   │   ├── calendarService.js
│   │   ├── crmService.js
│   │   └── reminderService.js
│   │
│   └── 📁 utils/
│       ├── logger.js
│       ├── helpers.js
│       └── validators.js
│
├── 📁 database/ (NEW - Database Scripts)
│   ├── schema.sql
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_staff_tables.sql
│   │   └── 003_add_availability.sql
│   └── seeds/
│       └── default_admin.sql
│
└── 📁 docs/ (NEW - Documentation)
    ├── API_DOCUMENTATION.md
    ├── DEPLOYMENT_GUIDE.md
    ├── WHATSAPP_SETUP.md
    ├── SMS_SETUP.md
    └── CRM_INTEGRATION.md
```

---

## 🗄️ Database Schema

### Tables to Create:

#### 1. **users** (Admin & Staff)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'admin' or 'staff'
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **staff** (Staff Details)
```sql
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    display_name VARCHAR(255),
    specialization VARCHAR(255),
    bio TEXT,
    profile_image_url VARCHAR(500),
    calendar_sync_enabled BOOLEAN DEFAULT false,
    google_calendar_id VARCHAR(255),
    outlook_calendar_id VARCHAR(255),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **availability** (Staff Availability Rules)
```sql
CREATE TABLE availability (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id),
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **bookings** (Extended from MVP 1)
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer Info
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_company VARCHAR(255),
    
    -- Booking Details
    service_type VARCHAR(100) NOT NULL,
    staff_id INTEGER REFERENCES staff(id),
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled
    lead_stage VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, converted
    booking_source VARCHAR(50), -- website, whatsapp, phone, manual
    
    -- Notifications
    confirmation_sent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    whatsapp_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Additional
    notes TEXT,
    internal_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP
);
```

#### 5. **settings** (System Settings)
```sql
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50), -- string, number, boolean, json
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **notifications** (Notification Log)
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id),
    notification_type VARCHAR(50), -- email, sms, whatsapp
    recipient VARCHAR(255),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(50), -- sent, failed, pending
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔑 Environment Variables

Create `.env` file:

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/smart_inquiry
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_inquiry
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# WhatsApp Cloud API (Meta)
WHATSAPP_CLOUD_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# SMS Provider (MSG91)
SMS_PROVIDER=msg91
MSG91_API_KEY=your_msg91_api_key
MSG91_SENDER_ID=TALTECH
MSG91_TEMPLATE_ID=your_template_id

# Email (SMTP or SendGrid)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=Smart Inquiry <noreply@taliyotech.com>

# Google Calendar
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/calendar/google/callback

# Outlook Calendar
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_REDIRECT_URI=http://localhost:5000/api/calendar/outlook/callback

# CRM Webhook
CRM_WEBHOOK_URL=https://your-crm.com/api/webhook
CRM_API_KEY=your_crm_api_key

# Admin
DEFAULT_ADMIN_EMAIL=admin@taliyotech.com
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123!

# Reminders
REMINDER_HOURS_BEFORE=24
REMINDER_CRON_SCHEDULE=0 9 * * *

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🎯 Implementation Phases

### **Phase 1: Backend Setup** (Day 1-2)
- ✅ Initialize Node.js project
- ✅ Setup Express server
- ✅ Configure PostgreSQL database
- ✅ Create database schema
- ✅ Setup authentication (JWT)
- ✅ Create basic API routes

### **Phase 2: Admin Dashboard** (Day 3-4)
- ✅ Create admin login page
- ✅ Build dashboard UI
- ✅ Implement bookings management
- ✅ Add staff management
- ✅ Create settings page

### **Phase 3: Multi-Staff Scheduling** (Day 5-6)
- ✅ Staff availability engine
- ✅ Auto-assignment logic
- ✅ Calendar sync (Google/Outlook)
- ✅ Conflict detection
- ✅ Buffer time management

### **Phase 4: WhatsApp Integration** (Day 7-8)
- ✅ Setup WhatsApp Cloud API
- ✅ Webhook handling
- ✅ Message templates
- ✅ Confirmation messages
- ✅ Reminder messages

### **Phase 5: Email & SMS** (Day 9-10)
- ✅ Email service setup
- ✅ SMS provider integration
- ✅ Reminder scheduling
- ✅ Template management
- ✅ Delivery tracking

### **Phase 6: CRM Integration** (Day 11-12)
- ✅ Webhook implementation
- ✅ Data mapping
- ✅ Error handling
- ✅ Retry logic
- ✅ Logging

### **Phase 7: Analytics** (Day 13-14)
- ✅ Booking metrics
- ✅ Conversion tracking
- ✅ Staff performance
- ✅ Dashboard charts
- ✅ Export functionality

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### Bookings
```
GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PUT    /api/bookings/:id
DELETE /api/bookings/:id
PATCH  /api/bookings/:id/status
GET    /api/bookings/calendar
```

### Staff
```
GET    /api/staff
POST   /api/staff
GET    /api/staff/:id
PUT    /api/staff/:id
DELETE /api/staff/:id
GET    /api/staff/:id/availability
PUT    /api/staff/:id/availability
GET    /api/staff/available-slots
```

### Availability
```
GET    /api/availability/check
POST   /api/availability/bulk-update
GET    /api/availability/staff/:staffId
```

### Notifications
```
POST   /api/notifications/send
GET    /api/notifications/log
POST   /api/notifications/test
```

### Webhooks
```
POST   /api/webhooks/whatsapp
POST   /api/webhooks/crm
GET    /api/webhooks/verify
```

### Analytics
```
GET    /api/analytics/overview
GET    /api/analytics/bookings
GET    /api/analytics/conversion
GET    /api/analytics/staff-performance
```

### Settings
```
GET    /api/settings
PUT    /api/settings
GET    /api/settings/:key
PUT    /api/settings/:key
```

---

## 📱 WhatsApp Message Templates

### 1. Booking Confirmation
```
Hi {{customer_name}}! 👋

Your booking is confirmed! ✅

📅 Date: {{booking_date}}
⏰ Time: {{booking_time}}
👤 Staff: {{staff_name}}
📍 Service: {{service_type}}

Booking ID: {{booking_reference}}

Need to reschedule? Click here: {{reschedule_link}}

See you soon!
- Team Smart Inquiry
```

### 2. Reminder (24h before)
```
Hi {{customer_name}}! 👋

Reminder: You have a booking tomorrow! ⏰

📅 Date: {{booking_date}}
⏰ Time: {{booking_time}}
👤 Staff: {{staff_name}}

Booking ID: {{booking_reference}}

Need to cancel? Click here: {{cancel_link}}

Looking forward to seeing you!
- Team Smart Inquiry
```

### 3. Cancellation Confirmation
```
Hi {{customer_name}},

Your booking has been cancelled. ❌

Booking ID: {{booking_reference}}

Want to book again? Visit: {{booking_link}}

- Team Smart Inquiry
```

---

## 📊 Analytics Metrics

### Dashboard Overview:
- Total Bookings (Today, This Week, This Month)
- Conversion Rate (Inquiries → Bookings)
- Revenue (if pricing enabled)
- Top Performing Staff
- Booking Sources Breakdown
- Lead Stage Distribution

### Charts:
- Bookings Over Time (Line Chart)
- Bookings by Service Type (Pie Chart)
- Bookings by Staff (Bar Chart)
- Conversion Funnel (Funnel Chart)

---

## 🚀 Deployment Checklist

### Backend:
- [ ] Setup production database (PostgreSQL)
- [ ] Configure environment variables
- [ ] Setup SSL certificates
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Setup logging (Winston/Morgan)
- [ ] Configure error tracking (Sentry)
- [ ] Setup backup strategy
- [ ] Configure auto-scaling (if needed)

### WhatsApp:
- [ ] Create Meta Business Account
- [ ] Verify business
- [ ] Setup WhatsApp Business API
- [ ] Create message templates
- [ ] Get templates approved
- [ ] Configure webhook URL
- [ ] Test message delivery

### SMS:
- [ ] Create MSG91/Twilio account
- [ ] Verify sender ID
- [ ] Create SMS templates
- [ ] Get DLT approval (India)
- [ ] Test SMS delivery

### Email:
- [ ] Configure SMTP/SendGrid
- [ ] Verify domain
- [ ] Setup SPF/DKIM records
- [ ] Create email templates
- [ ] Test email delivery

### CRM:
- [ ] Get CRM webhook URL
- [ ] Configure API credentials
- [ ] Map data fields
- [ ] Test webhook delivery
- [ ] Setup error notifications

---

## 💰 Cost Estimation (Monthly)

| Service | Provider | Cost (INR) |
|---------|----------|------------|
| **Hosting** | DigitalOcean/AWS | ₹1,000 - ₹3,000 |
| **Database** | PostgreSQL (Managed) | ₹1,500 - ₹5,000 |
| **WhatsApp** | Meta (per message) | ₹0.25 - ₹1.50 × volume |
| **SMS** | MSG91 (per SMS) | ₹0.15 - ₹0.50 × volume |
| **Email** | SendGrid (Free tier) | ₹0 - ₹1,000 |
| **Domain & SSL** | Namecheap/Let's Encrypt | ₹500 - ₹1,000 |
| **Monitoring** | Optional | ₹500 - ₹2,000 |
| **TOTAL** | | **₹3,700 - ₹13,000** |

*Note: WhatsApp & SMS costs depend on message volume*

---

## 🎯 Success Criteria

### MVP 2 is complete when:
- ✅ Admin can login and manage bookings
- ✅ Up to 5 staff members can be added
- ✅ Staff availability rules work correctly
- ✅ WhatsApp confirmations send automatically
- ✅ Email reminders send 24h before booking
- ✅ SMS reminders work (optional)
- ✅ CRM webhook pushes booking data
- ✅ Analytics dashboard shows key metrics
- ✅ Calendar sync works (Google/Outlook)
- ✅ All APIs are documented and tested

---

## 📞 Next Steps

1. **Review this plan** - Confirm requirements
2. **Setup development environment** - Install Node.js, PostgreSQL
3. **Start Phase 1** - Backend setup
4. **Iterative development** - Build and test each phase
5. **Deploy to staging** - Test in production-like environment
6. **Client testing** - Get feedback
7. **Production deployment** - Go live!

---

**Ready to start implementation?** 🚀

Let me know which phase you want me to begin with!
