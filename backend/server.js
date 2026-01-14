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
    if (isInitialized) return;
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        try {
            console.log('🔄 Initializing Co-Fleeter Backend...');
            
            // 1. Load Data (File + Optional Mongo)
            await store.loadAll();
            console.log('✅ Data loaded');

            // 2. Init Services
            emailService.init();
            console.log('✅ Email service initialized');

            // 3. Background Sync (non-blocking)
            dataService.syncEUASheetData()
                .then(() => console.log("✅ Initial EUA Sync Complete"))
                .catch(err => console.error("⚠️ Initial EUA Sync Failed", err));

            isInitialized = true;
            console.log('✅ Co-Fleeter Backend initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Initialization error:', error);
            console.error('Error stack:', error.stack);
            initPromise = null; // Reset on error
            isInitialized = false;
            throw error;
        }
    })();
    
    return initPromise;
}

// --- Middleware to ensure initialization (BEFORE routes) ---
app.use(async (req, res, next) => {
    // Skip initialization check for static files
    if (req.path.startsWith('/js/') || req.path.startsWith('/css/') || req.path.endsWith('.html') || req.path.endsWith('.ico')) {
        return next();
    }
    
    if (!isInitialized && !initPromise) {
        // Start initialization but don't wait for it
        initPromise = initialize().catch(err => {
            console.error('❌ Initialization error:', err);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            isInitialized = false;
            initPromise = null;
        });
    }
    
    // Wait for initialization to complete if it's in progress
    if (initPromise && !isInitialized) {
        try {
            await initPromise;
        } catch (error) {
            console.error('Initialization failed in middleware:', error);
            // Always return JSON for API routes
            if (req.path.startsWith('/api')) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Server initialization failed. Please try again in a moment.',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            return res.status(500).send('Server initialization failed');
        }
    }
    
    // If still not initialized after waiting, return error
    if (!isInitialized) {
        if (req.path.startsWith('/api')) {
            return res.status(503).json({ 
                success: false, 
                message: 'Server is initializing. Please try again in a moment.'
            });
        }
        return res.status(503).send('Server is initializing');
    }
    
    next();
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
}

// Export for Vercel Serverless Functions
module.exports = app;
