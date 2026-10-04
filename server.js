const express = require('express');
const multer = require('multer');
const AdmZip = require('adm-zip');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { spawn } = require('child_process');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const redis = require('redis');
const demoManager = require('./lib/demoManager');
const deployManager = require('./lib/deployManager');
const versionManager = require('./lib/versionManager');
const webhookManager = require('./lib/webhookManager');
const domainManager = require('./lib/domainManager');
const envManager = require('./lib/envManager');
const HealthMonitor = require('./lib/healthMonitor');
const analyticsManager = require('./lib/analyticsManager');
const { startBackgroundWorker } = require('./lib/worker');
const userManager = require('./lib/userManager');
const auditManager = require('./lib/auditManager');
const crmManager = require('./lib/crmManager');
const db = require('./lib/db');
const accessGate = require('./lib/accessGate');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Redis Setup (Priority 2.2 - stateless sessions)
let redisClient = null;
const initRedis = async () => {
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        try {
            redisClient = redis.createClient({
                url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
                socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 500) }
            });
            redisClient.on('error', (err) => logger?.warn('Redis error:', err));
            redisClient.on('connect', () => logger?.info('Redis connected'));
            await redisClient.connect();
            logger?.info('Redis session store initialized');
        } catch (err) {
            logger?.warn('Redis not available, using memory sessions:', err.message);
            redisClient = null;
        }
    }
};

// Logger setup (Priority 3)
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'taliyo-demo-host' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// --- SWAGGER SETUP (Priority 7) ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Taliyo Demo Host API',
            version: '1.0.0',
            description: 'Complete API documentation for Taliyo Marketplace platform',
            contact: { name: 'Taliyo Support', email: 'support@taliyo.com' }
        },
        servers: [
            { url: 'http://localhost:3000', description: 'Local Dev' },
            { url: 'https://demo.taliyotechnologies.com', description: 'Production (Cloudflare)' },
            { url: 'http://demo.taliyotechnologies.com:3000', description: 'Direct Access' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'userToken'
                }
            },
            schemas: {
                Lead: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        company: { type: 'string' },
                        status: { type: 'string', enum: ['new', 'contacted', 'qualified', 'in-progress', 'closed'] },
                        team: { type: 'string' },
                        createdAt: { type: 'string' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        email: { type: 'string' },
                        fullName: { type: 'string' },
                        role: { type: 'string', enum: ['admin', 'manager', 'user'] },
                        teams: { type: 'array', items: { type: 'string' } }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: { type: 'array' },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer' },
                                pageSize: { type: 'integer' },
                                total: { type: 'integer' },
                                totalPages: { type: 'integer' }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: [`${__dirname}/server.js`]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);



// Global Error Handlers (Prevent Crash)
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL ERROR (Uncaught Exception):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('CRITICAL ERROR (Unhandled Rejection):', reason);
});
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Track running demo processes
const demoProcesses = new Map(); // demoName -> { port, process, type }
let nextDemoPort = 4000; // Start allocating ports from 4000

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,  // Disable CSP for now (allow all external scripts)
    hsts: true,
    frameGuard: true,
    noSniff: true,
})); // Simplified security headers (Priority 1.3)
app.use(compression()); // Gzip compression (Priority 2.2)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Rate limiters (Priority 1.1) - adjusted for both prod and test
const isDev = process.env.NODE_ENV !== 'production';
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 50 : 5,  // More lenient in dev/test
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => isDev && (req.ip === '::1' || req.ip === '127.0.0.1'), // Skip localhost in dev
});

const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDev ? 50 : 3,  // More lenient in dev/test
    message: 'Too many signup attempts, please try again later',
    skip: (req, res) => isDev && (req.ip === '::1' || req.ip === '127.0.0.1'), // Skip localhost in dev
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDev ? 1000 : 100,  // Essentially unlimited in dev
    skip: (req, res) => isDev && (req.ip === '::1' || req.ip === '127.0.0.1'), // Skip localhost in dev
});

app.use('/api/', generalLimiter);

// Swagger UI Routes (Priority 7 - Interactive API Docs)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { 
    swaggerOptions: { persistAuthorization: true },
    customCss: '.topbar { display: none; } .swagger-ui .info { margin: 0; }',
    customCssUrl: null
}));

app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Request Logging + Security Headers (Production)
app.use((req, res, next) => {
    logger.info(`[Request] ${req.method} ${req.url}`, { ip: req.ip });
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Multer Setup for Zip Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// Authentication Middleware - centralized user session management
const userAuthMiddleware = async (req, res, next) => {
    if (req.cookies.auth === process.env.SECRET_KEY) {
        req.user = { email: 'admin', fullName: 'Admin', role: 'admin', teams: [] };
        return next();
    }

    const token = req.cookies.userToken;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const session = userManager.verifySession(token);
    if (!session) {
        return res.status(401).json({ error: 'Session expired' });
    }

    const user = await userManager.getUser(session.email);
    req.user = {
        ...session,
        role: user?.role || session.role || 'user',
        teams: user?.teams || []
    };
    next();
};

const requireRole = (role) => {
    return async (req, res, next) => {
        try {
            // Allow legacy admin auth cookie to pass
            if (req.cookies.auth === process.env.SECRET_KEY) {
                return next();
            }

            let user = await userManager.getUser(req.user.email);
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            if (user.role !== role && user.role !== 'admin') {
                return res.status(403).json({ error: 'Forbidden' });
            }

            next();
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
};

const requireTeamAccess = (team) => {
    return async (req, res, next) => {
        try {
            if (req.cookies.auth === process.env.SECRET_KEY) {
                return next();
            }

            const user = await userManager.getUser(req.user.email);
            if (!user) return res.status(401).json({ error: 'User not found' });

            if (user.role === 'admin') {
                return next();
            }

            if (user.role === 'manager' && (user.teams || []).includes(team)) {
                return next();
            }

            if ((user.teams || []).includes(team)) {
                return next();
            }

            return res.status(403).json({ error: 'Forbidden (team scope)' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
};

// --- HELPER FUNCTIONS ---

// Pagination Helper (Priority 4.2)
const paginate = (items, page = 1, pageSize = 20) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return {
        data: items.slice(start, end),
        pagination: {
            page,
            pageSize,
            total: items.length,
            totalPages: Math.ceil(items.length / pageSize)
        }
    };
};

// Redis Session Store Helper (Priority 2.2)
const getSessionFromStore = async (token) => {
    if (redisClient) {
        try {
            const session = await redisClient.get(`session:${token}`);
            return session ? JSON.parse(session) : null;
        } catch (err) {
            logger.warn('Redis get session error:', err);
            return null;
        }
    }
    return null;
};

const saveSessionToStore = async (token, session, ttl = 86400) => {
    if (redisClient) {
        try {
            await redisClient.setEx(`session:${token}`, ttl, JSON.stringify(session));
        } catch (err) {
            logger.warn('Redis save session error:', err);
        }
    }
};

const removeSessionFromStore = async (token) => {
    if (redisClient) {
        try {
            await redisClient.del(`session:${token}`);
        } catch (err) {
            logger.warn('Redis delete session error:', err);
        }
    }
};

// Initialize Health Monitor
const healthMonitor = new HealthMonitor(demoManager);

// Health Monitor Event Handlers
healthMonitor.on('unhealthy', ({ demoName, failCount }) => {
    console.log(`[Alert] Demo "${demoName}" is unhealthy (Failures: ${failCount})`);
});

healthMonitor.on('restarted', ({ demoName, result }) => {
    console.log(`[Alert] Demo "${demoName}" auto-restarted on port ${result.port}`);
});

healthMonitor.on('restart-failed', ({ demoName, error }) => {
    console.error(`[Critical] Failed to auto-restart "${demoName}": ${error}`);
});

healthMonitor.on('recovered', ({ demoName }) => {
    console.log(`[Info] Demo "${demoName}" has recovered`);
});

// Start health monitoring when first demo starts
let healthMonitorStarted = false;
const startHealthMonitor = () => {
    if (!healthMonitorStarted) {
        healthMonitor.start();
        healthMonitorStarted = true;
    }
};

// --- Routes ---

// Dashboard redirects
app.get(['/dashboard', '/dashboard.html', '/admin-dashboard'], (req, res) => {
    res.redirect('/admin/dashboard.html');
});

// Auth API endpoints
app.post('/api/auth/signup', 
    signupLimiter,
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('fullName').trim().isLength({ min: 2 }).optional(),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Signup validation failed', { errors: errors.array() });
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, fullName } = req.body;

        try {
            const user = await userManager.signup(email, password, fullName);
            const session = await userManager.login(email, password);
            
            res.cookie('userToken', session.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            logger.info('User signup success', { email });
            res.json({
                success: true,
                email: user.email,
                fullName: user.fullName
            });
        } catch (err) {
            logger.error('Signup error', { email, error: err.message });
            res.status(400).json({ error: err.message });
        }
});

app.post('/api/auth/login', 
    loginLimiter,
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('Login validation failed', { errors: errors.array() });
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            const session = await userManager.login(email, password);
            // Save session to Redis if available (Priority 2.2)
            await saveSessionToStore(session.token, session);
            
            res.cookie('userToken', session.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000,
                sameSite: 'strict'
            });

            logger.info('User login success', { email });
            res.json({
                success: true,
                token: session.token,
                email: session.email,
                fullName: session.fullName
            });
        } catch (err) {
            logger.warn('Login failed', { email });
            res.status(401).json({ error: err.message });
        }
});

app.get('/api/auth/me', userAuthMiddleware, async (req, res) => {
    try {
        const user = await userManager.getUser(req.user.email);
        res.json({
            email: req.user.email,
            fullName: req.user.fullName,
            role: user?.role || req.user.role,
            teams: user?.teams || [],
            user: user
        });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const token = req.cookies.userToken;
    if (token) {
        userManager.logout(token);
    }
    res.clearCookie('userToken');
    res.clearCookie('auth');
    res.json({ success: true });
});

// Direct Admin Login (used by /admin/login.html)
app.post('/api/login', (req, res) => {
    const username = req.body.username || req.body.email;
    const password = req.body.password;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        res.cookie('auth', process.env.SECRET_KEY, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000
        });
        return res.json({ success: true, message: 'Logged in successfully' });
    }
    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
});

app.post('/api/logout', (req, res) => {
    const token = req.cookies.userToken;
    if (token) {
        userManager.logout(token);
    }
    res.clearCookie('auth');
    res.clearCookie('userToken');
    res.json({ success: true });
});

// --- RBAC / Team Management ---
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Users retrieved successfully with pagination
 */
app.get('/api/admin/users', userAuthMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        
        const users = await userManager.getAllUsers();
        const paginated = paginate(users, page, pageSize);
        res.json({ success: true, ...paginated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/users/:email/role', userAuthMiddleware, requireRole('admin'), async (req, res) => {
    const { email } = req.params;
    const { role } = req.body;

    try {
        const user = await userManager.setRole(email, role);
        auditManager.appendAuditEvent({
            actor: req.user.email,
            action: 'set_role',
            target: email,
            role,
            performedAs: req.user.role,
            ip: req.ip,
        });
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/users/:email/team', userAuthMiddleware, requireRole('admin'), async (req, res) => {
    const { email } = req.params;
    const { team } = req.body;

    try {
        const user = await userManager.addTeam(email, team);
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/users/:email/team', userAuthMiddleware, requireRole('admin'), async (req, res) => {
    const { email } = req.params;
    const { team } = req.body;

    try {
        const user = await userManager.removeTeam(email, team);
        auditManager.appendAuditEvent({
            actor: req.user.email,
            action: 'remove_team',
            target: email,
            team,
            role: req.user.role,
            ip: req.ip,
        });
        res.json({ success: true, user });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.get('/api/team/:team/deployments', userAuthMiddleware, async (req, res, next) => {
    const { team } = req.params;
    return requireTeamAccess(team)(req, res, async () => {
        try {
            const deployments = await deployManager.getAll();
            const filtered = deployments.filter((d) => d.team === team);
            res.json({ success: true, deployments: filtered });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

app.get('/api/audit/events', userAuthMiddleware, requireRole('admin'), (req, res) => {
    try {
        const events = auditManager.getAllEvents();
        res.json({ success: true, events });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/audit/team/:team', userAuthMiddleware, async (req, res, next) => {
    const { team } = req.params;
    return requireTeamAccess(team)(req, res, () => {
        try {
            const events = auditManager.getEventsByTeam(team);
            res.json({ success: true, events });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    });
});

// 38. CRM (Admin + manager team visibility)
/**
 * @swagger
 * /api/admin/crm/leads:
 *   get:
 *     summary: Get all CRM leads with pagination
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: pageSize
 *         in: query
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
app.get('/api/admin/crm/leads', userAuthMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        
        let all = crmManager.getAllLeads();
        if (req.user.role !== 'admin') {
            all = all.filter((lead) => lead.team === req.user.team || lead.team === null);
        }
        
        const paginated = paginate(all, page, pageSize);
        res.json({ success: true, ...paginated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/crm/leads', 
    userAuthMiddleware, 
    requireRole('manager'),
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail(),
    body('company').trim().optional().isLength({ min: 2 }),
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'in-progress', 'closed']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logger.warn('CRM lead validation failed', { errors: errors.array() });
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { name, email, company, status, team } = req.body;
            const newLead = crmManager.addLead({ name, email, company, status: status || 'new', team: team || (req.user.teams?.[0] || null) });
            auditManager.appendAuditEvent({ actor: req.user.email, action: 'crm_add_lead', target: newLead.id, team: newLead.team, ip: req.ip });
            logger.info('CRM lead created', { leadId: newLead.id, email });
            res.json({ success: true, lead: newLead });
        } catch (err) {
            logger.error('CRM lead creation failed', { error: err.message });
            res.status(500).json({ success: false, message: err.message });
        }
});

app.patch('/api/admin/crm/leads/:id', 
    userAuthMiddleware, 
    requireRole('manager'),
    body('name').trim().isLength({ min: 2 }).optional(),
    body('email').isEmail().normalizeEmail().optional(),
    body('company').trim().isLength({ min: 2 }).optional(),
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'in-progress', 'closed']),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        try {
            const updated = crmManager.updateLead(id, req.body);
            if (!updated) return res.status(404).json({ success: false, message: 'Lead not found' });
            auditManager.appendAuditEvent({ actor: req.user.email, action: 'crm_update_lead', target: id, changes: req.body, ip: req.ip });
            logger.info('CRM lead updated', { leadId: id });
            res.json({ success: true, lead: updated });
        } catch (err) {
            logger.error('CRM lead update failed', { id, error: err.message });
            res.status(500).json({ success: false, message: err.message });
        }
});

app.delete('/api/admin/crm/leads/:id', userAuthMiddleware, requireRole('manager'), async (req, res) => {
    const { id } = req.params;
    try {
        crmManager.deleteLead(id);
        auditManager.appendAuditEvent({ actor: req.user.email, action: 'crm_delete_lead', target: id, ip: req.ip });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// User deployments API
app.get('/api/user/deployments', userAuthMiddleware, async (req, res) => {
    try {
        const deploymentIds = await userManager.getUserDeployments(req.user.email);
        const deployments = await Promise.all(deploymentIds.map(id => deployManager.getDeployment(id)));

        res.json({ success: true, deployments: deployments.filter(d => d !== null) });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/user/profile', userAuthMiddleware, async (req, res) => {
    const { fullName } = req.body;

    try {
        const updated = await userManager.updateProfile(req.user.email, { fullName });
        res.json({ success: true, user: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ===== ADMIN AUTHENTICATION (Modern Next.js) =====
// Admin routes now handled by Next.js apps in /apps/admin/

// System directories that must NEVER be treated as user demos
const SYSTEM_DIRECTORIES = new Set([
    'node_modules', 'uploads', 'admin', 'common', '.git', 'lib', 'data',
    'database', 'audit-logs', 'logs', 'tests', 'apps', 'packages', 'completed_docs'
]);

function isRealDemo(name) {
    if (!name || name.startsWith('.')) return false;
    if (SYSTEM_DIRECTORIES.has(name.toLowerCase())) return false;
    const demoPath = path.join(__dirname, name);
    try {
        if (!fs.lstatSync(demoPath).isDirectory()) return false;
        // Verify it contains actual web files
        const hasHtml = fs.existsSync(path.join(demoPath, 'index.html')) || fs.existsSync(path.join(demoPath, 'index.htm'));
        const hasServer = fs.existsSync(path.join(demoPath, 'server.js')) || fs.existsSync(path.join(demoPath, 'index.js'));
        const hasPkg = fs.existsSync(path.join(demoPath, 'package.json'));
        const hasStandalone = fs.existsSync(path.join(demoPath, 'standalone', 'server.js'));
        const hasPhp = fs.existsSync(path.join(demoPath, 'index.php')) || fs.existsSync(path.join(demoPath, 'artisan')) || fs.existsSync(path.join(demoPath, 'public', 'index.php'));
        const hasPython = fs.existsSync(path.join(demoPath, 'app.py')) || fs.existsSync(path.join(demoPath, 'main.py'));
        return hasHtml || hasServer || hasPkg || hasStandalone || hasPhp || hasPython;
    } catch {
        return false;
    }
}

function getDemoMetadata(name) {
    const demoPath = path.join(__dirname, name);
    let size = 0;
    let mtime = null;
    try {
        const stats = fs.statSync(demoPath);
        mtime = stats.mtime;
    } catch (_) {}
    return { mtime };
}

// 3. List Demos API
app.get('/api/demos', userAuthMiddleware, (req, res) => {
    try {
        const items = fs.readdirSync(__dirname, { withFileTypes: true });
        const demos = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => isRealDemo(name))
            .map(name => {
                try {
                    const demoPath = path.join(__dirname, name);
                    const type = demoManager.detectDemoType(demoPath);
                    const meta = getDemoMetadata(name);

                    // Check for custom URL in .config.json
                    let customUrl = null;
                    const configPath = path.join(demoPath, '.config.json');
                    if (fs.existsSync(configPath)) {
                        try {
                            const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                            customUrl = conf.customUrl;
                        } catch (e) { }
                    }

                    const viewUrl = `/view/${name}`;
                    return { 
                        name, 
                        type, 
                        customUrl, 
                        viewUrl,
                        updatedAt: meta.mtime ? meta.mtime.toISOString() : null
                    };
                } catch (err) {
                    console.error(`Error processing demo ${name}:`, err);
                    return { name, type: 'error', viewUrl: `/view/${name}` };
                }
            });
        res.json({ demos });
    } catch (err) {
        console.error('Failed to list demos:', err);
        res.status(500).json({ error: 'Failed to retrieve demos', demos: [] });
    }
});

// 5b. Public List Demos API
app.get('/api/public/demos', (req, res) => {
    try {
        const items = fs.readdirSync(__dirname, { withFileTypes: true });
        const demos = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => isRealDemo(name))
            .map(name => {
                try {
                    const demoPath = path.join(__dirname, name);
                    const type = demoManager.detectDemoType(demoPath);
                    let customUrl = null;
                    const configPath = path.join(demoPath, '.config.json');
                    if (fs.existsSync(configPath)) {
                        try {
                            const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                            customUrl = conf.customUrl;
                        } catch (e) { }
                    }
                    return { name, type, customUrl };
                } catch (err) {
                    return { name, type: 'error' };
                }
            });
        res.json({ demos });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve public demos', demos: [] });
    }
});

// 6. Upload API
app.post('/api/upload', userAuthMiddleware, upload.single('demoZip'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const zipPath = req.file.path;
        const zip = new AdmZip(zipPath);

        // Extract to named directory
        let safeName = path.parse(req.file.originalname).name;
        safeName = safeName.replace(/[^a-zA-Z0-9_\-]/g, '_');
        // Guard against reserved system names
        const reservedNames = ['lib', 'database', 'admin', 'common', 'data', 'uploads', 'node_modules', 'tests', 'server.js', 'package.json', 'package-lock.json', '.env'];
        if (reservedNames.includes(safeName.toLowerCase())) {
            fs.unlinkSync(zipPath);
            return res.status(400).json({ success: false, message: 'Invalid demo name: conflicts with system directory' });
        }

        const targetDir = path.join(__dirname, safeName);

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

        zip.extractAllTo(targetDir, true);

        // Delete zip file after extraction
        fs.unlinkSync(zipPath);

        // Determine demo type and perform optional autostart for server-style demos
        const demoType = demoManager.detectDemoType(targetDir);
        let deploymentUrl = null;

        if (['nodejs', 'nextjs', 'nextjs-standalone', 'php', 'laravel', 'python'].includes(demoType)) {
            try {
                const started = await demoManager.startDemo(safeName);
                deploymentUrl = started.url;
            } catch (startErr) {
                console.error(`Auto-start failed for ${safeName}:`, startErr.message);
                deploymentUrl = `/view/${safeName}`;
            }
        } else if (demoType === 'static') {
            deploymentUrl = `/${safeName}`;
        }

        const userToken = req.cookies.userToken;
        const user = userToken ? userManager.verifySession(userToken) : null;
        let team = null;
        if (user && user.email) {
            try {
                const u = await userManager.getUser(user.email);
                team = u?.teams?.[0] || null;
            } catch (_) {}
        }

        const deployment = await deployManager.createDeployment({
            type: demoType === 'static' ? 'frontend' : (demoType === 'nodejs' ? 'backend' : 'frontend'),
            demoName: safeName,
            title: `${safeName} (${demoType})`,
            url: deploymentUrl,
            status: 'running',
            team
        });

        deployManager.appendLog(deployment.id, `Uploaded with type ${demoType}, url ${deploymentUrl}`);
        auditManager.appendAuditEvent({
            actor: user?.email || (req.cookies.auth === process.env.SECRET_KEY ? 'admin' : 'anonymous'),
            action: 'upload_demo',
            target: deployment.id,
            demoName: safeName,
            team,
            ip: req.ip,
        });

        // Link to user account if authenticated
        if (userToken && user) {
            await userManager.addDeployment(user.email, deployment.id);
        }

        res.json({ success: true, message: 'Demo uploaded and extracted successfully!', folder: safeName, type: demoType, url: deploymentUrl, deploymentId: deployment.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error unpacking zip file' });
    }
});

// 7. Delete Demo API
// 7. Delete Demo API
app.post('/api/delete', userAuthMiddleware, async (req, res) => {
    const { folderName } = req.body;

    // Basic safety check
    if (!folderName || ['node_modules', 'uploads', 'admin', 'common', 'server.js', '.env', 'package.json'].includes(folderName)) {
        return res.status(400).json({ success: false, message: 'Cannot delete restricted items' });
    }

    const targetPath = path.join(__dirname, folderName);

    if (!fs.existsSync(targetPath)) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    // Stop if running
    if (demoManager.getDemoInfo(folderName)) {
        demoManager.stopDemo(folderName);
        // Wait for process to fully exit and release file locks
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    try {
        // Retry logic for EPERM/EBUSY (common on Windows)
        const maxRetries = 5;
        for (let i = 0; i < maxRetries; i++) {
            try {
                fs.rmSync(targetPath, { recursive: true, force: true });
                return res.json({ success: true });
            } catch (err) {
                if ((err.code === 'EPERM' || err.code === 'EBUSY') && i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                throw err;
            }
        }
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ success: false, message: 'Failed to delete: File locked or permission denied' });
    }
});

// 8. Get Demo Config API
app.get('/api/config/:demoName', (req, res) => {
    const { demoName } = req.params;
    const configPath = path.join(__dirname, demoName, '.config.json');

    // Check if demo exists
    const demoPath = path.join(__dirname, demoName);
    if (!fs.existsSync(demoPath) || !fs.lstatSync(demoPath).isDirectory()) {
        return res.status(404).json({ error: 'Demo not found' });
    }

    // Return config if exists, otherwise return empty object
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            res.json({ config });
        } catch (err) {
            res.json({ config: {} });
        }
    } else {
        res.json({ config: {} });
    }
});

// 9. Update Demo Config API (Admin Only)
app.post('/api/config/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const { config } = req.body;

    const demoPath = path.join(__dirname, demoName);
    if (!fs.existsSync(demoPath) || !fs.lstatSync(demoPath).isDirectory()) {
        return res.status(404).json({ success: false, message: 'Demo not found' });
    }

    const configPath = path.join(demoPath, '.config.json');

    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to save config' });
    }
});

// 10. Start Demo (Admin Only)
app.post('/api/demo/start/:demoName', userAuthMiddleware, async (req, res) => {
    const { demoName } = req.params;

    try {
        const result = await demoManager.startDemo(demoName);

        // Start health monitoring if this is the first demo
        startHealthMonitor();

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 11. Stop Demo (Admin Only)
app.post('/api/demo/stop/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const stopped = demoManager.stopDemo(demoName);

    if (stopped) {
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false, message: 'Demo not running' });
    }
});

// 12. Get Demo Status
app.get('/api/demo/status/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const demoPath = path.join(__dirname, demoName);
    const demoType = demoManager.detectDemoType(demoPath);
    const info = demoManager.getDemoInfo(demoName);

    if (info) {
        res.json({ running: true, type: demoType, ...info });
    } else {
        res.json({ running: false, type: demoType });
    }
});

// 13. Get All Running Demos
app.get('/api/demo/running', userAuthMiddleware, (req, res) => {
    const running = demoManager.getAllRunning();
    res.json({ demos: running });
});

// 14. Rename Demo API
app.post('/api/rename', userAuthMiddleware, (req, res) => {
    const { oldName, newName } = req.body;

    // Safety checks
    if (!oldName || !newName) return res.status(400).json({ success: false, message: 'Invalid names' });
    if (['node_modules', 'uploads', 'admin', 'common', 'server.js', '.env', 'package.json', 'lib'].includes(newName)) {
        return res.status(400).json({ success: false, message: 'Restricted name' });
    }

    const oldPath = path.join(__dirname, oldName);
    const newPath = path.join(__dirname, newName);

    if (!fs.existsSync(oldPath)) return res.status(404).json({ success: false, message: 'Demo not found' });
    if (fs.existsSync(newPath)) return res.status(400).json({ success: false, message: 'Name already exists' });

    // Stop if running
    const wasRunning = demoManager.getDemoInfo(oldName);
    if (wasRunning) {
        demoManager.stopDemo(oldName);
    }

    try {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Rename failed' });
    }
});

// 15. Get Logs API
app.get('/api/logs/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const logs = demoManager.getDemoLogs(demoName);
    res.json({ logs });
});

// 15. Heartbeat API (Keep Alive)
app.post('/api/heartbeat/:demoName', (req, res) => {
    const { demoName } = req.params;
    demoManager.registerHeartbeat(demoName);
    res.json({ success: true });
});

// ===== ENVIRONMENT VARIABLES APIs =====

// 16. Get Environment Variables
app.get('/api/env/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    try {
        const vars = envManager.getEnvVars(demoName);
        res.json({ success: true, vars });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 17. Save Environment Variables
app.post('/api/env/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const { vars } = req.body;

    if (!Array.isArray(vars)) {
        return res.status(400).json({ success: false, message: 'vars must be an array' });
    }

    try {
        envManager.saveEnvVars(demoName, vars);
        res.json({ success: true, message: 'Environment variables saved. Restart demo to apply changes.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 18. Delete Environment Variable
app.delete('/api/env/:demoName/:key', userAuthMiddleware, (req, res) => {
    const { demoName, key } = req.params;
    try {
        envManager.deleteEnvVar(demoName, key);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 19. Import .env File
app.post('/api/env/:demoName/import', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ success: false, message: 'No content provided' });
    }

    try {
        envManager.importEnvFile(demoName, content);
        res.json({ success: true, message: 'Environment variables imported successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 20. Export .env File
app.get('/api/env/:demoName/export', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    try {
        const content = envManager.exportEnvFile(demoName);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${demoName}.env"`);
        res.send(content);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ===== HEALTH CHECK APIs =====

// Public health check (Cloudflare + local generic readiness)
app.get('/health', (req, res) => {
    const now = new Date().toISOString();
    const runningDemos = demoManager.getAllRunning();
    res.json({
        status: 'ok',
        timestamp: now,
        server: 'taliyo-demo-host',
        runningDemos: Object.keys(runningDemos).length,
        runningDemosDetail: runningDemos
    });
});

// 21. Get Health Status for All Demos
app.get('/api/health', userAuthMiddleware, (req, res) => {
    const health = healthMonitor.getAllHealthStatus();
    res.json({ success: true, health });
});

// 21b. Get Database Health Status
app.get('/api/health/db', (req, res) => {
    res.json({
        success: true,
        dbConnected: db.isConnected(),
        dbType: db.dbType,
        message: db.isConnected() ? 'Database connection established' : 'Database not configured, JSON file storage fallback in use'
    });
});

// 22. Get Health Status for Specific Demo
app.get('/api/health/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    const health = healthMonitor.getHealthStatus(demoName);
    res.json({ success: true, health });
});

// 23. Force Health Check
app.post('/api/health/:demoName/check', userAuthMiddleware, async (req, res) => {
    const { demoName } = req.params;
    try {
        const health = await healthMonitor.forceCheck(demoName);
        res.json({ success: true, health });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 24. Reset Health Status
app.post('/api/health/:demoName/reset', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    healthMonitor.resetHealth(demoName);
    res.json({ success: true, message: 'Health status reset' });
});

// ===== ANALYTICS APIs =====

// 25. Get Analytics for Specific Demo
app.get('/api/analytics/:demoName', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    try {
        const analytics = analyticsManager.getAnalytics(demoName);
        res.json({ success: true, analytics });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 26. Get All Analytics
app.get('/api/analytics', userAuthMiddleware, (req, res) => {
    try {
        const analytics = analyticsManager.getAllAnalytics();
        res.json({ success: true, analytics });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 27. Reset Analytics for a Demo
app.post('/api/analytics/:demoName/reset', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    try {
        analyticsManager.resetAnalytics(demoName);
        res.json({ success: true, message: 'Analytics reset successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 28. Export Analytics as CSV
app.get('/api/analytics/:demoName/export', userAuthMiddleware, (req, res) => {
    const { demoName } = req.params;
    try {
        const csv = analyticsManager.exportToCSV(demoName);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${demoName}-analytics.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 29. Get Top Demos by Visits
app.get('/api/analytics/top/:limit?', userAuthMiddleware, (req, res) => {
    const limit = parseInt(req.params.limit) || 10;
    try {
        const topDemos = analyticsManager.getTopDemos(limit);
        res.json({ success: true, topDemos });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 30. Demo Summary (Admin Dashboard Quick Stats)
app.get('/api/demo/summary', userAuthMiddleware, (req, res) => {
    try {
        const items = fs.readdirSync(__dirname, { withFileTypes: true });
        const allDemos = items
            .filter(item => item.isDirectory())
            .map(item => item.name)
            .filter(name => !['node_modules', 'uploads', 'admin', 'common', '.git', 'lib'].includes(name));

        const running = demoManager.getAllRunning();
        const topDemos = analyticsManager.getTopDemos(5);

        res.json({
            success: true,
            totalDemos: allDemos.length,
            runningDemos: Object.keys(running).length,
            stoppedDemos: allDemos.length - Object.keys(running).length,
            demos: allDemos,
            running,
            topDemos
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 31. Detect Project Type
app.post('/api/detect', userAuthMiddleware, (req, res) => {
    const { demoName } = req.body;
    if (!demoName) return res.status(400).json({ success: false, message: 'demoName required' });

    try {
        const demoPath = path.join(__dirname, demoName);
        if (!fs.existsSync(demoPath) || !fs.lstatSync(demoPath).isDirectory()) {
            return res.status(404).json({ success: false, message: 'Demo folder not found' });
        }
        const type = demoManager.detectDemoType(demoPath);
        res.json({ success: true, type });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 32. Deployment records
app.get('/api/deployments', userAuthMiddleware, async (req, res) => {
    try {
        const all = await deployManager.getAll();
        res.json({ success: true, deployments: all });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/deployments/:id', userAuthMiddleware, async (req, res) => {
    try {
        const deployment = await deployManager.getDeployment(req.params.id);
        if (!deployment) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, deployment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/logs/:id', userAuthMiddleware, (req, res) => {
    try {
        const log = deployManager.getLog(req.params.id);
        res.setHeader('Content-Type', 'text/plain');
        res.send(log);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 16. Shared Background Worker endpoint (Railway + non-proxy)
app.get('/api/worker', userAuthMiddleware, async (req, res) => {
    try {
        const result = await startBackgroundWorker();
        res.json({ success: true, worker: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Worker failed' });
    }
});

app.post('/api/worker', userAuthMiddleware, async (req, res) => {
    try {
        const result = await startBackgroundWorker();
        res.json({ success: true, worker: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message || 'Worker failed' });
    }
});

const workerIntervalSec = parseInt(process.env.WORKER_INTERVAL_SEC || '0', 10);
if (workerIntervalSec > 0) {
    setInterval(async () => {
        try {
            await startBackgroundWorker();
        } catch (err) {
            console.error('Background worker scheduled error:', err);
        }
    }, workerIntervalSec * 1000);
}

// ===== PHASE 2: ADVANCED FEATURES =====

// 33. Environment Variables Management
app.get('/api/env/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const vars = envManager.getEnvVars(deployment.demoName);
        res.json({ success: true, vars });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/env/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const { vars } = req.body;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        envManager.saveEnvVars(deployment.demoName, vars);
        deployManager.appendLog(deploymentId, 'Environment variables updated');
        res.json({ success: true, message: 'Env vars saved. Restart to apply.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 34. Deployment Versioning
app.get('/api/versions/:deploymentId', userAuthMiddleware, (req, res) => {
    const { deploymentId } = req.params;
    try {
        const versions = versionManager.getVersions(deploymentId);
        res.json({ success: true, versions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/versions/:deploymentId', userAuthMiddleware, (req, res) => {
    const { deploymentId } = req.params;
    const { metadata } = req.body;
    try {
        const version = versionManager.createVersion(deploymentId, metadata);
        deployManager.appendLog(deploymentId, `Version created: ${version.versionId}`);
        res.json({ success: true, version });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/versions/:deploymentId/rollback/:versionId', userAuthMiddleware, async (req, res) => {
    const { deploymentId, versionId } = req.params;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const result = versionManager.rollbackToVersion(deploymentId, versionId);
        await deployManager.updateDeployment(deploymentId, { status: 'rolling-back', log: `Rollback initiated to ${versionId}` });
        
        // If backend, restart
        if (deployment.demoName) {
            await demoManager.stopDemo(deployment.demoName);
            await new Promise(r => setTimeout(r, 1000));
            await demoManager.startDemo(deployment.demoName);
        }

        await deployManager.updateDeployment(deploymentId, { status: 'running', log: 'Rollback completed' });
        res.json({ success: true, ...result });
    } catch (err) {
        deployManager.appendLog(deploymentId, `Rollback failed: ${err.message}`);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 35. Health Monitoring & Status
app.get('/api/health/deployment/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const demoName = deployment.demoName;
        const demoInfo = demoManager.getDemoInfo(demoName);
        let healthStatus = {};

        if (demoInfo && demoInfo.running) {
            healthStatus = {
                running: true,
                type: demoInfo.type,
                port: demoInfo.port,
                pid: demoInfo.process?.pid,
                uptime: Math.floor((Date.now() - (demoInfo.startedAt || Date.now())) / 1000),
                lastHealthCheck: new Date().toISOString()
            };
        } else {
            healthStatus = { running: false, type: deployment.type };
        }

        res.json({ success: true, health: healthStatus });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/health/auto-restart/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const { enabled } = req.body;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        await deployManager.updateDeployment(deploymentId, { autoRestart: enabled, log: `Auto-restart ${enabled ? 'enabled' : 'disabled'}` });
        res.json({ success: true, autoRestart: enabled });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 36. Webhooks (CI/CD)
app.post('/api/webhooks/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const { provider, repoUrl, branches } = req.body;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const webhook = webhookManager.createWebhook({ deploymentId, provider, repoUrl, branches });
        deployManager.appendLog(deploymentId, `Webhook created: ${provider} ${repoUrl}`);
        res.json({ success: true, webhook });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/webhooks/:deploymentId', userAuthMiddleware, (req, res) => {
    const { deploymentId } = req.params;
    try {
        const webhooks = webhookManager.getWebhooks(deploymentId);
        res.json({ success: true, webhooks });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/webhooks/:deploymentId/:webhookId', userAuthMiddleware, (req, res) => {
    const { deploymentId, webhookId } = req.params;
    try {
        webhookManager.deleteWebhook(deploymentId, webhookId);
        deployManager.appendLog(deploymentId, `Webhook deleted: ${webhookId}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GitHub Webhook receiver (public endpoint)
app.post('/api/webhook/github/:deploymentId', async (req, res) => {
    const { deploymentId } = req.params;
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const payload = JSON.stringify(req.body);

    try {
        const webhooks = webhookManager.getWebhooks(deploymentId);
        const webhook = webhooks.find(w => w.provider === 'github');
        if (!webhook) return res.status(404).json({ success: false, message: 'No Github webhook configured' });

        if (!webhookManager.verifyGitHubSignature(payload, signature, webhook.secret)) {
            return res.status(401).json({ success: false, message: 'Invalid signature' });
        }

        if (event === 'push' && webhook.branches.includes(req.body.ref?.split('/').pop())) {
            webhookManager.updateWebhookTrigger(deploymentId, webhook.webhookId);
            deployManager.appendLog(deploymentId, `Webhook triggered: GitHub push on branch ${req.body.ref}`);
            res.json({ success: true, message: 'Deployment triggered' });
            
            // Trigger redeploy (auto-restart)
            const deployment = await deployManager.getDeployment(deploymentId);
            if (deployment && deployment.demoName) {
                demoManager.stopDemo(deployment.demoName).catch(e => console.error(e));
                setTimeout(() => demoManager.startDemo(deployment.demoName).catch(e => console.error(e)), 1000);
            }
        } else {
            res.json({ success: false, message: 'Event or branch not configured' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 37. Custom Domains
app.post('/api/domains/:deploymentId', userAuthMiddleware, async (req, res) => {
    const { deploymentId } = req.params;
    const { domain, primary, ssl } = req.body;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const domainEntry = domainManager.addDomain(deploymentId, domain, { primary, ssl });
        deployManager.appendLog(deploymentId, `Domain added: ${domain}`);
        res.json({ success: true, domain: domainEntry });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

app.get('/api/domains/:deploymentId', userAuthMiddleware, (req, res) => {
    const { deploymentId } = req.params;
    try {
        const domains = domainManager.getDomains(deploymentId);
        res.json({ success: true, domains });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/domains/:deploymentId/:domain/verify', userAuthMiddleware, async (req, res) => {
    const { deploymentId, domain } = req.params;
    const { dnsRecords } = req.body;
    const deployment = await deployManager.getDeployment(deploymentId);
    if (!deployment) return res.status(404).json({ success: false, message: 'Deployment not found' });

    try {
        const verified = domainManager.verifyDomain(deploymentId, domain, dnsRecords);
        if (verified) {
            deployManager.appendLog(deploymentId, `Domain verified: ${domain}`);
            res.json({ success: true, message: 'Domain verified' });
        } else {
            res.status(404).json({ success: false, message: 'Domain not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/domains/:deploymentId/:domain', userAuthMiddleware, (req, res) => {
    const { deploymentId, domain } = req.params;
    try {
        domainManager.removeDomain(deploymentId, domain);
        deployManager.appendLog(deploymentId, `Domain removed: ${domain}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 38. Real-time Logs (SSE - Server-Sent Events)
const logSubscribers = new Map(); // deploymentId -> Set of response objects

app.get('/api/logs/:deploymentId/stream', userAuthMiddleware, (req, res) => {
    const { deploymentId } = req.params;
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!logSubscribers.has(deploymentId)) {
        logSubscribers.set(deploymentId, new Set());
    }
    logSubscribers.get(deploymentId).add(res);

    res.write('data: {"status":"connected"}\n\n');

    req.on('close', () => {
        logSubscribers.get(deploymentId).delete(res);
        res.end();
    });
});

// Helper to broadcast log lines
const broadcastLog = (deploymentId, message) => {
    if (logSubscribers.has(deploymentId)) {
        const data = JSON.stringify({ timestamp: new Date().toISOString(), message });
        logSubscribers.get(deploymentId).forEach(client => {
            client.write(`data: ${data}\n\n`);
        });
    }
};

// ===== END PHASE 2 =====

// 17. Demo Launcher (On-Demand Start)
app.get('/launch/:demoName', (req, res) => {
    const { demoName } = req.params;
    const { return: returnUrl } = req.query; // Preserve return url

    // If already running, redirect immediately
    const info = demoManager.getDemoInfo(demoName);
    if (info) {
        const port = info.port;
        const configPath = path.join(__dirname, demoName, '.config.json');
        let customUrl = null;
        if (fs.existsSync(configPath)) {
            try {
                const conf = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                customUrl = conf.customUrl;
            } catch (e) { }
        }

        let target = `http://${req.hostname}:${port}`;
        if (customUrl) {
            target = customUrl.startsWith('http') ? customUrl : `http://${req.hostname}:${port}${customUrl.startsWith('/') ? '' : '/'}${customUrl}`;
        }

        // Append return URL logic handled by the injected script, not here.
        // User just wants to go to the demo.
        return res.redirect(target);
    }

    // Serve Loading Page
    const loadingPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starting Demo...</title>
        <style>
            body { background: #0a0a0f; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; }
            .loader { width: 48px; height: 48px; border: 5px solid #fff; border-bottom-color: #6366f1; border-radius: 50%; display: inline-block; box-sizing: border-box; animation: rotation 1s linear infinite; margin-bottom: 20px; }
            @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { font-weight: 500; margin-bottom: 8px; }
            p { color: #a1a1aa; font-size: 14px; }
        </style>
    </head>
    <body>
        <span class="loader"></span>
        <h2>Starting ${demoName}...</h2>
        <p>Please wait while we boot up the environment.</p>
        <script>
            async function start() {
                try {
                    // Trigger Start
                    const res = await fetch('/api/demo/start/${demoName}', { method: 'POST' });
                    const data = await res.json();
                    
                    if (data.success) {
                        // Poll for readiness (simple delay for now, or check status)
                        checkStatus();
                    } else {
                        document.querySelector('h2').textContent = 'Error Starting Demo';
                        document.querySelector('p').textContent = data.message;
                    }
                } catch (e) {
                    document.querySelector('h2').textContent = 'Connection Error';
                }
            }

            async function checkStatus() {
                // Poll every 2 seconds
                setInterval(async () => {
                    try {
                        const res = await fetch('/api/demo/status/${demoName}');
                        const data = await res.json();
                        if (data.running) {
                             // Construct Target URL (matches server logic)
                             let target = 'http://' + window.location.hostname + ':' + data.port;
                             // We don't have customUrl here easily without another API call, but usually direct port is fine.
                             // Reloading /launch/... will now hit the "Already Running" redirect block which has full logic.
                             window.location.reload(); 
                        }
                    } catch (e) {}
                }, 2000);
            }

            start();
        </script>
    </body>
    </html>
    `;
    res.send(loadingPage);
});

// -------------------------------------------------------------
// 20-Minute Rotating Access Gatekeeper System
// -------------------------------------------------------------

function checkDemoAuthorization(req, res) {
    // 1. Admin bypass (logged in via cookie auth or user session)
    if (req.cookies && (req.cookies.auth === process.env.SECRET_KEY || (req.cookies.userToken && userManager.verifySession(req.cookies.userToken)))) {
        return true;
    }

    // 2. Query parameter check (?auth=123456 or ?passcode=123456)
    const queryCode = req.query && (req.query.auth || req.query.passcode);
    if (queryCode && accessGate.verifyPasscode(queryCode)) {
        const token = accessGate.createAccessToken();
        res.cookie('taliyo_demo_auth', token, { maxAge: 20 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
        return true;
    }

    // 3. Valid 20-min session cookie
    if (req.cookies && req.cookies.taliyo_demo_auth) {
        if (accessGate.verifyAccessToken(req.cookies.taliyo_demo_auth)) {
            return true;
        }
    }

    return false;
}

// Gate Verification POST endpoint
app.post('/api/auth/gate-verify', (req, res) => {
    const passcode = req.body && req.body.passcode;
    const returnUrl = (req.body && req.body.returnUrl) || '/';

    if (accessGate.verifyPasscode(passcode)) {
        const token = accessGate.createAccessToken();
        res.cookie('taliyo_demo_auth', token, { maxAge: 20 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
        return res.redirect(returnUrl);
    } else {
        return res.status(401).send(accessGate.renderGateHTML(returnUrl, '❌ Galat ya expired passcode! Kripya naya 20-minute code lekar aaiye.'));
    }
});

// Admin endpoint to view current 20-minute live passcode
app.get('/api/admin/gate-passcode', userAuthMiddleware, (req, res) => {
    res.json({ success: true, ...accessGate.getCurrentGateInfo() });
});

// Serve Admin Dashboard directly (prevents HTTP 302 'Found' redirect issues)
app.get('/advanced-protection.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'advanced-protection.js'));
});

app.get(['/admin', '/admin/', '/admin/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// Serve Admin Static Assets
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Middleware to inject Back Button and Advanced Protection into all Demo HTML files
app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Ignore API, Admin, Landing Page, and static system assets
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path === '/' || req.path === '/index.html' || req.path === '/advanced-protection.js' || req.path === '/favicon.ico') return next();

    // Enforce Clean Slugs: Redirect any /index.html or .html to clean slug
    if (req.path.endsWith('/index.html')) {
        const cleanSlug = req.path.replace(/\/index\.html$/, '') || '/';
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(301, cleanSlug + query);
    }
    if (req.path.endsWith('.html')) {
        const cleanSlug = req.path.replace(/\.html$/, '');
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(301, cleanSlug + query);
    }

    // Prevent directory traversal
    const safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, safePath);

    // Handle Directory Index
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // Handle Extensionless URLs (try adding .html)
    if (!fs.existsSync(filePath) && !filePath.endsWith('.html')) {
        if (fs.existsSync(filePath + '.html')) {
            filePath += '.html';
        }
    }

    // Only process existing HTML files
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile() && (filePath.endsWith('.html') || filePath.endsWith('.htm'))) {
        // Enforce 20-minute Rotating Gate Authorization
        if (!checkDemoAuthorization(req, res)) {
            return res.send(accessGate.renderGateHTML(req.originalUrl));
        }
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Inject Advanced Protection into <head> if not already present
            if (!content.includes('advanced-protection.js')) {
                const protectTag = '\n    <!-- Advanced Code Protection -->\n    <script src="/advanced-protection.js"></script>\n';
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `${protectTag}</head>`);
                } else if (content.includes('</HEAD>')) {
                    content = content.replace('</HEAD>', `${protectTag}</HEAD>`);
                }
            }

            // Script to inject Back Button
            const injection = `
            <style>
                .taliyo-back-btn { position: fixed; top: 20px; left: 20px; z-index: 2147483647; width: 45px; height: 45px; background: #0f172a; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; text-decoration: none; box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
                .taliyo-back-btn:hover { transform: scale(1.1); background: #1e293b; }
                .taliyo-back-btn svg { width: 24px; height: 24px; stroke-width: 2.5; }
            </style>
            <a href="javascript:void(0)" onclick="const p=new URLSearchParams(window.location.search); window.location.href=p.get('return')||'/';" class="taliyo-back-btn" title="Back to Gallery">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </a>
            `;

            if (content.includes('</body>')) {
                content = content.replace('</body>', injection + '</body>');
            } else {
                content += injection;
            }

            res.send(content);
            return;
        } catch (err) { next(); }
    } else {
        next();
    }
});

// 17. On-Demand Proxy & Launcher
const http = require('http');

app.all('/view/:demoName*', async (req, res) => {
    const { demoName } = req.params;
    let targetPath = req.url.replace(`/view/${demoName}`, '') || '/';

    // Normalize target path
    if (targetPath.startsWith('//')) targetPath = targetPath.substring(1);

    // Strip /index.html or .html from /view/ URLs for clean slugs
    if (targetPath === '/index.html' || targetPath === '/index') {
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(301, `/view/${demoName}${query}`);
    }
    if (targetPath.endsWith('.html')) {
        const cleanSub = targetPath.replace(/\.html$/, '');
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        return res.redirect(301, `/view/${demoName}${cleanSub}${query}`);
    }

    // Enforce 20-minute Rotating Gate Authorization
    if (!checkDemoAuthorization(req, res)) {
        return res.send(accessGate.renderGateHTML(req.originalUrl));
    }

    // Track visit start time for response time analytics
    const visitStartTime = Date.now();
    const visitorIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // 1. Get/Start Demo
    let info = demoManager.getDemoInfo(demoName);

    if (!info) {
        // Try starting
        try {
            // Check if directory exists first to avoid 404 loops or random starts
            const demoPath = path.join(__dirname, demoName);
            if (!fs.existsSync(demoPath)) return res.status(404).send('Demo not found');

            // Start (Start method handles concurrency)
            info = await demoManager.startDemo(demoName);

            if (info.type === 'static' || info.type === 'error') {
                // It's static, redirect to clean static slug URL
                const cleanSub = (targetPath === '/' || targetPath === '/index.html') ? '' : targetPath.replace(/\.html$/, '');
                return res.redirect(`/${demoName}${cleanSub}`);
            }
        } catch (e) {
            return res.status(500).send(`Failed to start demo: ${e.message}`);
        }
    } else {
        // Update activity
        demoManager.updateActivity(demoName);
    }

    // 2. Proxy Request
    if (info && info.port) {
        const options = {
            hostname: 'localhost',
            port: info.port,
            path: targetPath,
            method: req.method,
            headers: {
                ...req.headers,
                'x-forwarded-host': req.headers.host,
                'x-forwarded-for': req.ip,
                'x-forwarded-proto': req.protocol,
                // 'host': `localhost:${info.port}` // Some apps need this, others need original
            }
        };

        const proxyReq = http.request(options, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });

            // Track visit analytics (only for HTML pages, not assets)
            if (targetPath === '/' || targetPath.endsWith('.html')) {
                const responseTime = Date.now() - visitStartTime;
                analyticsManager.trackVisit(demoName, visitorIP, userAgent, responseTime);
            }
        });

        proxyReq.on('error', (err) => {
            console.error(`Proxy Error [${demoName}]:`, err.message);
            if (!res.headersSent) res.status(502).send('Bad Gateway: Connection refused');
        });

        if (req.body && Object.keys(req.body).length > 0) {
            let bodyData = null;
            const contentType = (req.headers['content-type'] || '').toLowerCase();
            if (contentType.includes('application/json')) {
                bodyData = JSON.stringify(req.body);
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const querystring = require('querystring');
                bodyData = querystring.stringify(req.body);
            } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
                bodyData = req.body;
            }

            if (bodyData !== null) {
                options.headers['content-length'] = Buffer.byteLength(bodyData);
                proxyReq.write(bodyData);
                proxyReq.end();
            } else {
                req.pipe(proxyReq, { end: true });
            }
        } else {
            req.pipe(proxyReq, { end: true });
        }
    } else {
        res.status(404).send('Demo not valid');
    }
});

// Middleware to Redirect & Gatekeeper Root Folder access to /view/
app.use((req, res, next) => {
    // Only GET
    if (req.method !== 'GET') return next();

    const firstPart = req.path.split('/')[1];
    if (!firstPart || ['admin', 'api', 'common', 'uploads', 'view', 'launch', 'advanced-protection.js', 'favicon.ico', 'robots.txt'].includes(firstPart)) return next();

    // Check if this is a monitored demo
    const demoPath = path.join(__dirname, firstPart);
    if (fs.existsSync(demoPath) && fs.lstatSync(demoPath).isDirectory()) {
        // Enforce Gatekeeper for direct demo folder access
        if (!checkDemoAuthorization(req, res)) {
            return res.send(accessGate.renderGateHTML(req.originalUrl));
        }

        const type = demoManager.detectDemoType(demoPath);
        // If it's a server app, redirect to /view/
        // Enforcing /view/ ensures auto-start logic works.
        if (type !== 'static') {
            const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
            return res.redirect(`/view/${firstPart}${req.path.substring(firstPart.length + 1)}${query}`);
        }
    }
    next();
});

// Root Landing Page
app.get('/', (req, res) => {
    // If auth query param is provided on root, set 20-min session cookie
    const queryCode = req.query && (req.query.auth || req.query.passcode);
    if (queryCode && accessGate.verifyPasscode(queryCode)) {
        const token = accessGate.createAccessToken();
        res.cookie('taliyo_demo_auth', token, { maxAge: 20 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Security Firewall: Block direct access to server secrets, configs, databases, and source code
app.use((req, res, next) => {
    const requested = req.path.toLowerCase();
    const blockedPatterns = [
        /^\/\./,                                // Hidden files (/.env, /.git, etc.)
        /\.env($|\.)/,                          // Any env file
        /\.(db|sqlite|log)$/,                   // Database and log files
        /^\/(server\.js|package\.json|package-lock\.json|ecosystem\.config\.js|dockerfile)$/, // Root system files
        /^\/(lib|database|node_modules|tests)\//, // Backend source directories
        /^\/data\/users\.json/                  // User auth data
    ];

    if (blockedPatterns.some(pattern => pattern.test(requested))) {
        return res.status(403).json({ error: 'Access denied: protected system resource' });
    }
    next();
});

// Clean URLs - Redirect .html to without extension (except admin panel)
app.use((req, res, next) => {
    if (req.path.startsWith('/admin')) return next();
    if (req.path.endsWith('.html')) {
        const cleanPath = req.path.slice(0, -5);
        return res.redirect(301, cleanPath + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''));
    }
    next();
});

// Serve Demo Assets and Public Static Files (Block dotfiles)
app.use(express.static(__dirname, { extensions: ['html', 'htm'], dotfiles: 'deny' }));

// 18. Catch-All Smart Proxy (Fallback for Demo Assets)
// If express.static didn't find it, maybe it belongs to a running demo?
app.use(async (req, res, next) => {
    const referer = req.headers.referer;
    if (!referer) return res.status(404).send('Not Found');

    try {
        const refUrl = new URL(referer);
        // Check if referer is a demo view
        const match = refUrl.pathname.match(/^\/view\/([^/]+)/);

        if (match && match[1]) {
            const demoName = match[1];
            const info = demoManager.getDemoInfo(demoName);

            if (info && info.running) {
                // Determine target path
                // If existing path is /_next/..., pass as is.
                // If it's specific, we might need to be careful? 
                // We just proxy exact path requested.

                const options = {
                    hostname: 'localhost',
                    port: info.port,
                    path: req.url,
                    method: req.method,
                    headers: {
                        ...req.headers,
                        // Ensure host header matches for some strict apps
                        'x-forwarded-host': req.headers.host,
                    }
                };

                // Log for debugging
                // console.log(`[Proxy] ${req.url} -> ${demoName}:${info.port}`);

                const proxyReq = http.request(options, (proxyRes) => {
                    // if (proxyRes.statusCode === 404) return res.status(404).send('Not Found in Demo');
                    res.writeHead(proxyRes.statusCode, proxyRes.headers);
                    proxyRes.pipe(res, { end: true });
                });

                proxyReq.on('error', (e) => {
                    // console.error(`Proxy Error: ${e.message}`);
                    if (!res.headersSent) res.status(502).send('Bad Gateway');
                });

                req.pipe(proxyReq, { end: true });
                return;
            }
        }
    } catch (e) { }

    res.status(404).send('Not Found');
});

// Global error handler for Express routes
app.use((err, req, res, next) => {
    logger.error('Unhandled route error', { error: err.message, stack: err.stack });
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ success: false, message: 'Internal Server Error', ...(process.env.NODE_ENV !== 'production' && { error: err.message }) });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Not Found' });
});

// Only listen when running locally (not on Vercel)
if (process.env.VERCEL !== '1') {
    app.listen(PORT, async () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`API Docs: http://localhost:${PORT}/api-docs`);
        
        // Initialize Redis for session store (Priority 2.2)
        await initRedis();
    });
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    demoManager.stopAll();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down gracefully...');
    demoManager.stopAll();
    process.exit(0);
});

// Export for Vercel
module.exports = app;
