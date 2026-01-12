-- ===================================
-- SMART INQUIRY CAPTURE - DATABASE SCHEMA
-- MVP 2 - Business Tier
-- PostgreSQL 14+
-- ===================================

-- Drop existing tables if they exist (for fresh install)
-- WARNING: This will delete all data!
-- Comment out these lines if you want to preserve existing data

-- DROP TABLE IF EXISTS notifications CASCADE;
-- DROP TABLE IF EXISTS bookings CASCADE;
-- DROP TABLE IF EXISTS availability CASCADE;
-- DROP TABLE IF EXISTS staff CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS settings CASCADE;

-- ===================================
-- TABLE: users
-- Stores admin and staff user accounts
-- ===================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ===================================
-- TABLE: staff
-- Stores staff member details and preferences
-- ===================================
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    bio TEXT,
    profile_image_url VARCHAR(500),
    
    -- Calendar sync settings
    calendar_sync_enabled BOOLEAN DEFAULT false,
    google_calendar_id VARCHAR(255),
    google_refresh_token TEXT,
    outlook_calendar_id VARCHAR(255),
    outlook_refresh_token TEXT,
    
    -- Availability
    is_available BOOLEAN DEFAULT true,
    auto_assign BOOLEAN DEFAULT true,
    
    -- Display order
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for faster joins
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON staff(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_is_available ON staff(is_available);

-- ===================================
-- TABLE: availability
-- Stores staff availability rules
-- ===================================
CREATE TABLE IF NOT EXISTS availability (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
    
    -- Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Time slots
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Status
    is_available BOOLEAN DEFAULT true,
    
    -- Special dates (optional - for holidays/exceptions)
    specific_date DATE,
    is_exception BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure end_time is after start_time
    CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Create indexes for faster availability checks
CREATE INDEX IF NOT EXISTS idx_availability_staff_id ON availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability(specific_date);

-- ===================================
-- TABLE: bookings
-- Stores all booking information
-- ===================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    
    -- Customer Information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_company VARCHAR(255),
    
    -- Booking Details
    service_type VARCHAR(100) NOT NULL,
    staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    -- Status Management
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    lead_stage VARCHAR(50) DEFAULT 'new' CHECK (lead_stage IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    booking_source VARCHAR(50) CHECK (booking_source IN ('website', 'whatsapp', 'phone', 'manual', 'api')),
    
    -- Notification Tracking
    confirmation_sent BOOLEAN DEFAULT false,
    confirmation_sent_at TIMESTAMP,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP,
    whatsapp_sent BOOLEAN DEFAULT false,
    whatsapp_sent_at TIMESTAMP,
    sms_sent BOOLEAN DEFAULT false,
    sms_sent_at TIMESTAMP,
    
    -- Additional Information
    notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Ensure booking is in the future (can be disabled for testing)
    CONSTRAINT check_future_booking CHECK (booking_date >= CURRENT_DATE)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone ON bookings(customer_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_lead_stage ON bookings(lead_stage);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ===================================
-- TABLE: settings
-- Stores system-wide settings
-- ===================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on setting_key
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);

-- ===================================
-- TABLE: notifications
-- Stores notification log for tracking
-- ===================================
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'sms', 'whatsapp')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'queued')),
    
    -- Delivery Info
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- External IDs (from providers)
    external_id VARCHAR(255),
    provider_response TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ===================================
-- FUNCTIONS & TRIGGERS
-- ===================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- DEFAULT DATA
-- ===================================

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, setting_type, description, is_public) VALUES
    ('company_name', 'Smart Inquiry Capture', 'string', 'Company name displayed in emails and messages', true),
    ('company_email', 'contact@taliyotech.com', 'string', 'Company contact email', true),
    ('company_phone', '+91 XXXXX XXXXX', 'string', 'Company contact phone', true),
    ('booking_duration_default', '60', 'number', 'Default booking duration in minutes', false),
    ('buffer_time_minutes', '15', 'number', 'Buffer time between bookings', false),
    ('max_advance_booking_days', '90', 'number', 'Maximum days in advance for booking', false),
    ('min_advance_booking_hours', '2', 'number', 'Minimum hours in advance for booking', false),
    ('enable_whatsapp', 'true', 'boolean', 'Enable WhatsApp notifications', false),
    ('enable_sms', 'false', 'boolean', 'Enable SMS notifications', false),
    ('enable_email', 'true', 'boolean', 'Enable email notifications', false),
    ('reminder_hours_before', '24', 'number', 'Hours before booking to send reminder', false),
    ('business_hours_start', '09:00', 'string', 'Business hours start time', false),
    ('business_hours_end', '18:00', 'string', 'Business hours end time', false),
    ('timezone', 'Asia/Kolkata', 'string', 'System timezone', false)
ON CONFLICT (setting_key) DO NOTHING;

-- ===================================
-- VIEWS (Optional - for easier queries)
-- ===================================

-- View: Upcoming bookings with staff details
CREATE OR REPLACE VIEW upcoming_bookings AS
SELECT 
    b.id,
    b.booking_reference,
    b.customer_name,
    b.customer_email,
    b.customer_phone,
    b.service_type,
    b.booking_date,
    b.booking_time,
    b.status,
    s.display_name as staff_name,
    s.specialization as staff_specialization,
    b.created_at
FROM bookings b
LEFT JOIN staff s ON b.staff_id = s.id
WHERE b.booking_date >= CURRENT_DATE
    AND b.status NOT IN ('cancelled', 'completed')
ORDER BY b.booking_date, b.booking_time;

-- View: Staff with availability count
CREATE OR REPLACE VIEW staff_availability_summary AS
SELECT 
    s.id,
    s.display_name,
    s.specialization,
    s.is_available,
    COUNT(a.id) as availability_slots_count,
    u.email as user_email
FROM staff s
LEFT JOIN availability a ON s.id = a.staff_id AND a.is_available = true
LEFT JOIN users u ON s.user_id = u.id
GROUP BY s.id, s.display_name, s.specialization, s.is_available, u.email;

-- ===================================
-- GRANTS (Optional - for security)
-- ===================================

-- Grant permissions to application user (if using separate DB user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO smart_inquiry_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO smart_inquiry_app;

-- ===================================
-- SCHEMA VERSION
-- ===================================

INSERT INTO settings (setting_key, setting_value, setting_type, description) VALUES
    ('schema_version', '2.0.0', 'string', 'Database schema version')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '2.0.0';

-- ===================================
-- COMPLETION MESSAGE
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables: users, staff, availability, bookings, settings, notifications';
    RAISE NOTICE '🔍 Views: upcoming_bookings, staff_availability_summary';
    RAISE NOTICE '⚙️  Default settings inserted';
    RAISE NOTICE '🚀 Ready for MVP 2 implementation!';
END $$;
