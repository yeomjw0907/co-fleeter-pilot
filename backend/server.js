
// Load dotenv only in development (Vercel injects env vars directly in production)
try {
    if (process.env.NODE_ENV !== 'production') {
        require('dotenv').config();
    }
} catch (e) {
    // dotenv not required in production
}
const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./models/store');
const emailService = require('./services/emailService');
const dataService = require('./services/dataService');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const tradingRoutes = require('./routes/tradingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const poolingRoutes = require('./routes/poolingRoutes');

const app = express();
const PORT = process.env.PORT || 8000;

// --- Production MongoDB Check ---
if (process.env.NODE_ENV === 'production' && !process.env.MONGO_URI) {
    console.error('❌ MONGO_URI environment variable is required for production deployment');
    console.error('Please set it in Vercel Dashboard → Settings → Environment Variables');
    process.exit(1);
}

// --- Middlewares ---
const allowedOrigins = process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL || 'https://*.vercel.app']
    : ['http://localhost:3000', 'http://localhost:8000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (process.env.NODE_ENV === 'production') {
            // In production, allow any vercel.app domain and same origin requests
            if (origin.includes('.vercel.app') || origin === process.env.FRONTEND_URL) {
                return callback(null, true);
            }
            // Allow same origin (when frontend and backend are on same domain in Vercel)
            return callback(null, true);
        } else {
            // In development, allow localhost
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Global initialization flag ---
let isInitialized = false;
let initPromise = null;

async function initialize() {
    if (isInitialized) return true;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            console.log('🔄 Initializing Co-Fleeter Backend...');

            // 1. Load Data (File + Optional Mongo)
            try {
                await store.loadAll();
                console.log('✅ Data loaded');
            } catch (loadError) {
                console.error('⚠️ Data load error (continuing with defaults):', loadError.message);
                // Continue with defaults - ensure admin user exists
                _ensureAdminAndTraders();
            }

            // 2. Init Services (non-critical)
            try {
                emailService.init();
                console.log('✅ Email service initialized');
            } catch (emailError) {
                console.warn('⚠️ Email service init failed (non-critical):', emailError.message);
            }

            // 3. Background Sync (non-blocking, don't wait)
            dataService.syncEUASheetData()
                .then(() => console.log("✅ Initial EUA Sync Complete"))
                .catch(err => console.error("⚠️ Initial EUA Sync Failed", err));

            isInitialized = true;
            console.log('✅ Co-Fleeter Backend initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialization error:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            initPromise = null; // Reset on error
            isInitialized = false;
            // Don't throw - allow server to continue with defaults
            // Ensure admin user exists even if initialization failed
            try {
                _ensureAdminAndTraders();
            } catch (e) {
                console.error('Failed to ensure admin user:', e);
            }
            return false; // Return false instead of throwing
        }
    })();

    return initPromise;
}

// Helper function to ensure admin user exists (fallback)
function _ensureAdminAndTraders() {
    try {
        const { db } = require('./models/store');
        const { DEFAULT_ROLE_PERMISSIONS } = require('./config/constants');

        if (!db) {
            console.warn('Database not available for _ensureAdminAndTraders');
            return;
        }

        // Ensure users array exists
        if (!db.users || !Array.isArray(db.users)) {
            db.users = [];
        }

        // Ensure Admin
        let adminUser = db.users.find(u => u && u.email === 'cfadmin@cofleeter.com');
        if (!adminUser) {
            adminUser = {
                id: 'admin_cf',
                role: 'ADMIN',
                email: 'cfadmin@cofleeter.com',
                password: '1234',
                name: 'Super Admin',
                company: 'Co-Fleeter',
                permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN || {}
            };
            db.users.unshift(adminUser);
            console.log("✅ Admin user ensured");
        }
    } catch (error) {
        console.error('Error in _ensureAdminAndTraders:', error.message);
        // Don't throw - this is a fallback function
    }
}

// --- Middleware to ensure initialization (BEFORE routes) ---
app.use(async (req, res, next) => {
    try {
        // Skip initialization check for static files
        if (req.path.startsWith('/js/') || req.path.startsWith('/css/') || req.path.endsWith('.html') || req.path.endsWith('.ico')) {
            return next();
        }

        // Start initialization if not started (non-blocking)
        if (!isInitialized && !initPromise) {
            initPromise = initialize().catch(err => {
                console.error('Initialization error (non-blocking):', err.message);
                isInitialized = false;
                initPromise = null;
                // Ensure admin user exists even if initialization failed
                _ensureAdminAndTraders();
                return false;
            });
        }

        // For API routes, wait briefly for initialization (max 3 seconds)
        if (req.path.startsWith('/api') && initPromise && !isInitialized) {
            try {
                await Promise.race([
                    initPromise,
                    new Promise((resolve) => setTimeout(() => resolve(false), 3000)) // 3초만 대기
                ]);
            } catch (error) {
                console.error('Initialization error in middleware:', error.message);
                // Continue anyway
            }
        }

        // Always allow requests to proceed
        // Controllers will handle the case when db is not fully initialized
        next();
    } catch (error) {
        console.error('Middleware error:', error);
        // Always return JSON for API routes
        if (req.path.startsWith('/api')) {
            return res.status(500).json({
                success: false,
                message: 'Server error. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        next(error);
    }
});

// --- Routes Mounting ---
app.use('/api/auth', authRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pooling', poolingRoutes);
app.use('/api', apiRoutes);

// --- Error Handler Middleware ---
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (req.path.startsWith('/api')) {
        // API routes should return JSON
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    } else {
        // Non-API routes can return HTML or redirect
        res.status(err.status || 500).send(err.message || 'Internal server error');
    }
});

// --- 404 Handler for API routes ---
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// --- Start Server (Development Only) ---
if (process.env.NODE_ENV !== 'production') {
    (async () => {
        await initialize();
        app.listen(PORT, () => {
            console.log(`Co-Fleeter Backend running on port ${PORT}`);
            console.log(`Make sure to run frontend on http://localhost:3000 or open index.html`);
        });
    })();
} else {
    // In production, don't initialize on import
    // Let it initialize on first request via middleware
    console.log('✅ Co-Fleeter Backend loaded for Vercel Serverless');
    // Ensure admin user exists immediately (synchronous, safe)
    try {
        _ensureAdminAndTraders();
    } catch (e) {
        console.warn('Failed to ensure admin user on load:', e.message);
    }
}

// Export for Vercel Serverless Functions
module.exports = app;
