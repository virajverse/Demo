// ===================================
// SMART INQUIRY CAPTURE - MAIN SERVER
// MVP 2 - Business Tier
// Node.js + Express + PostgreSQL
// ===================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Initialize Express app
const app = express();

// ===================================
// CONFIGURATION
// ===================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===================================
// MIDDLEWARE
// ===================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// ===================================
// HEALTH CHECK
// ===================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        version: '2.0.0'
    });
});

// ===================================
// API ROUTES
// ===================================

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'Smart Inquiry Capture API - MVP 2',
        version: '2.0.0',
        status: 'Running',
        documentation: '/api/docs',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            bookings: '/api/bookings',
            staff: '/api/staff',
            availability: '/api/availability',
            notifications: '/api/notifications',
            analytics: '/api/analytics',
            settings: '/api/settings',
            webhooks: '/api/webhooks'
        }
    });
});

// Import routes (will be created in next steps)
// const authRoutes = require('./routes/auth');
// const bookingRoutes = require('./routes/bookings');
// const staffRoutes = require('./routes/staff');
// const availabilityRoutes = require('./routes/availability');
// const notificationRoutes = require('./routes/notifications');
// const analyticsRoutes = require('./routes/analytics');
// const settingsRoutes = require('./routes/settings');
// const webhookRoutes = require('./routes/webhooks');

// Mount routes
// app.use('/api/auth', authRoutes);
// app.use('/api/bookings', bookingRoutes);
// app.use('/api/staff', staffRoutes);
// app.use('/api/availability', availabilityRoutes);
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/webhooks', webhookRoutes);

// ===================================
// ERROR HANDLING
// ===================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===================================
// DATABASE CONNECTION TEST
// ===================================

const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'smart_inquiry',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.error('Please check your database configuration in .env file');
    } else {
        console.log('✅ Database connected successfully');
        console.log('📊 Database time:', res.rows[0].now);
    }
});

// Export pool for use in other modules
module.exports.pool = pool;

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

// ===================================
// START SERVER
// ===================================

const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ===================================');
    console.log('🚀 Smart Inquiry Capture - MVP 2');
    console.log('🚀 ===================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🚀 Environment: ${NODE_ENV}`);
    console.log(`🚀 API URL: http://localhost:${PORT}`);
    console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
    console.log('🚀 ===================================');
    console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
    // Close server & exit process
    server.close(() => process.exit(1));
});
