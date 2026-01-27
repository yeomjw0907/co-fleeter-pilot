
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

            // 1. Load Data (File + Optional Mongo) - Never throw
            try {
                await store.loadAll();
                console.log('✅ Data loaded');
            } catch (loadError) {
                console.error('⚠️ Data load error (continuing with defaults):', loadError.message);
                // Ensure fallback initialization
                try {
                    _ensureAdminAndTraders();
                } catch (fallbackError) {
                    console.error('⚠️ Fallback init failed:', fallbackError.message);
                }
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

            // Mark as initialized even if some parts failed - server should be operational
            isInitialized = true;
            console.log('✅ Co-Fleeter Backend initialized (with possible fallbacks)');
            return true;
        } catch (error) {
            console.error('❌ Critical initialization error:', error);
            // Still mark as initialized to prevent infinite retries
            isInitialized = true;
            initPromise = null;
            try {
                _ensureAdminAndTraders();
                console.log('✅ Using emergency fallback initialization');
            } catch (e) {
                console.error('❌ Emergency fallback failed:', e);
            }
            // Return true anyway - server should attempt to serve requests
            return true;
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
                // Longer timeout for serverless to allow Supabase connection
                const timeout = process.env.NODE_ENV === 'production' ? 8000 : 3000;
                await Promise.race([
                    initPromise,
                    new Promise((resolve) => setTimeout(() => {
                        console.warn('⚠️ Initialization timeout after ' + timeout + 'ms, continuing with defaults');
                        isInitialized = true; // Mark as initialized to prevent retries
                        _ensureAdminAndTraders(); // Ensure at least admin exists
                        resolve(false);
                    }, timeout))
                ]);
            } catch (error) {
                console.error('❌ Initialization error in middleware:', error.message);
                console.error('   Stack:', error.stack);
                // Ensure basic setup even on error
                isInitialized = true;
                _ensureAdminAndTraders();
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
    console.error('Error stack:', err.stack);

    if (res.headersSent) {
        return next(err);
    }

    // ALWAYS return JSON for API routes
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? {
            message: err.message,
            stack: err.stack
        } : undefined
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
    console.log('Environment check:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET');
    
    // Check for required environment variables in production
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('❌ CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
        console.error('❌ Application will run with in-memory data only');
        console.error('❌ Please set environment variables in Vercel Dashboard');
    } else {
        console.log('✅ Supabase configuration detected');
    }
    
    try {
        _ensureAdminAndTraders();
    } catch (e) {
        console.error('Failed to ensure admin user on load:', e.message);
    }
}

// Export for Vercel Serverless Functions
module.exports = app;
