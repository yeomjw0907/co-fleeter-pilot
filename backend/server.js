
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

// --- Middlewares ---
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        // Allow localhost and Vercel domains
        if (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('co-fleeter')) {
            return callback(null, true);
        }
        callback(null, true); // Allow all for now
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
            initPromise = null;
            isInitialized = false;
            try {
                _ensureAdminAndTraders();
            } catch (e) {
                console.error('Failed to ensure admin user:', e);
            }
            return false;
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

        if (!db.users || !Array.isArray(db.users)) {
            db.users = [];
        }

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
    }
}

// --- Middleware to ensure initialization (BEFORE routes) ---
app.use(async (req, res, next) => {
    try {
        if (req.path.startsWith('/js/') || req.path.startsWith('/css/') || req.path.endsWith('.html') || req.path.endsWith('.ico')) {
            return next();
        }

        if (!isInitialized && !initPromise) {
            initPromise = initialize().catch(err => {
                console.error('Initialization error (non-blocking):', err.message);
                isInitialized = false;
                initPromise = null;
                _ensureAdminAndTraders();
                return false;
            });
        }

        if (req.path.startsWith('/api') && initPromise && !isInitialized) {
            try {
                await Promise.race([
                    initPromise,
                    new Promise((resolve) => setTimeout(() => resolve(false), 3000))
                ]);
            } catch (error) {
                console.error('Initialization error in middleware:', error.message);
            }
        }

        next();
    } catch (error) {
        console.error('Middleware error:', error);
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

// --- SPA Fallback ---
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({
        success: false,
        message: 'A server error has occurred',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    console.log('✅ Co-Fleeter Backend loaded for Vercel Serverless');
    try {
        _ensureAdminAndTraders();
    } catch (e) {
        console.warn('Failed to ensure admin user on load:', e.message);
    }
}

// Export for Vercel Serverless Functions
module.exports = app;
