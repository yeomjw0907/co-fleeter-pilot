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
            // In production, allow any vercel.app domain
            if (origin.includes('.vercel.app') || origin === process.env.FRONTEND_URL) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
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

// --- Initialization & Start ---
(async () => {
    // 1. Load Data (File + Optional Mongo)
    await store.loadAll();

    // 2. Init Services
    emailService.init();

    // 3. Background Sync
    dataService.syncEUASheetData()
        .then(() => console.log("Initial EUA Sync Complete"))
        .catch(err => console.error("Initial EUA Sync Failed", err));

    // --- Routes Mounting ---
    app.use('/api/auth', authRoutes);
    app.use('/api/trading', tradingRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/pooling', poolingRoutes);
    app.use('/api', apiRoutes);

    // --- Start Server ---
    if (process.env.NODE_ENV !== 'production') {
        app.listen(PORT, () => {
            console.log(`Co-Fleeter Backend running on port ${PORT}`);
            console.log(`Make sure to run frontend on http://localhost:3000 or open index.html`);
        });
    } else {
        console.log('✅ Co-Fleeter Backend initialized for Vercel Serverless');
    }
})();

// Export for Vercel Serverless Functions
module.exports = app;
