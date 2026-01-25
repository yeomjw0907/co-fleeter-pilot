const fs = require('fs');
const paths = require('../config/paths');
const { INITIAL_CII_CONSTANTS } = require('../config/constants');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/constants');

// --- In-Memory Stores ---
// --- MongoDB Adapter ---
const mongo = require('../models/mongo');

// --- In-Memory Stores ---
const db = {
    users: [],
    fleets: {}, // { userId: [ships] }
    fuelData: {},
    euData: {},
    ciiConstants: JSON.parse(JSON.stringify(INITIAL_CII_CONSTANTS)), // Deep copy default
    euaManualData: [],
    euaSheetCache: [],
    accessLogs: [],
    userData: {}, // { userId: { calculations: [] } }
    traderContacts: {
        ETS: [],
        FuelEU: {}
    },
    orders: [],
    trades: [],
    pools: [],
    executedVolumes: {}, // { symbol: { priceStr: volume } }
    emailConfig: {
        service: 'gmail',
        auth: { user: '', pass: '' }
    }
};

// --- Persistence Helpers ---

function loadJSON(filePath, defaultValue) {
    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        } catch (e) {
            console.error(`Failed to load ${filePath}`, e);
        }
    }
    return defaultValue;
}

function saveJSON(filePath, data) {
    // Skip file writes in production (Vercel uses read-only filesystem)
    if (process.env.NODE_ENV === 'production') {
        return true; // MongoDB will handle persistence
    }

    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.warn(`Failed to save ${filePath} (this is OK in production):`, e.message);
        return false;
    }
}

// --- persistence internal helpers for Mongo ---
async function saveToMongo(key, data) {
    if (mongo.mongoose && mongo.mongoose.connection.readyState === 1) {
        try {
            await mongo.GlobalData.updateOne(
                { key },
                { key, data },
                { upsert: true }
            );
        } catch (e) { console.error(`Mongo Save Error [${key}]`, e); }
    }
}

// --- Load Logic ---
async function loadAll() {
    try {
        // 1. Load from Files first (Fastest / Default)
        // In production, skip file loading (Vercel read-only filesystem)
        if (process.env.NODE_ENV !== 'production') {
            db.fuelData = loadJSON(paths.FUEL_DATA_FILE, {});
            db.euData = loadJSON(paths.EU_DATA_FILE, {});
            const loadedCii = loadJSON(paths.CII_DATA_FILE, {});
            if (loadedCii.CII_REDUCTION) db.ciiConstants.CII_REDUCTION = loadedCii.CII_REDUCTION;
            if (loadedCii.CII_REF) db.ciiConstants.CII_REF = loadedCii.CII_REF;

            db.users = loadJSON(paths.USERS_FILE, []);
            db.fleets = loadJSON(paths.FLEETS_FILE, {});
            db.accessLogs = loadJSON(paths.ACCESS_LOGS_FILE, []);
            db.euaManualData = loadJSON(paths.EUA_MANUAL_FILE, []);
            db.euaSheetCache = loadJSON(paths.EUA_SHEET_CACHE_FILE, []);
            db.userData = loadJSON(paths.USER_DATA_FILE, {});

            const loadedContacts = loadJSON(paths.TRADER_CONTACTS_FILE, {});
            db.traderContacts = { ...db.traderContacts, ...loadedContacts };

            db.emailConfig = loadJSON(paths.EMAIL_CONFIG_FILE, db.emailConfig);

            db.orders = loadJSON(paths.ORDERS_FILE, []);
            db.trades = loadJSON(paths.TRADES_FILE, []);
            db.pools = loadJSON(paths.POOLS_FILE, []);
        } else {
            console.log('Production mode: Skipping file system reads');
        }

        // 2. Try MongoDB Connection (with timeout)
        if (process.env.MONGO_URI) {
            console.log("Connecting to MongoDB...");
            try {
                const connectionPromise = mongo.connectDB(process.env.MONGO_URI);
                // Reduce timeout in production for faster failure
                const timeout = process.env.NODE_ENV === 'production' ? 5000 : 10000;
                const timeoutPromise = new Promise((resolve) =>
                    setTimeout(() => resolve(false), timeout)
                );

                const connected = await Promise.race([connectionPromise, timeoutPromise]);

                if (connected) {
                    console.log("Syncing data from MongoDB...");
                    try {
                        const syncPromise = mongo.GlobalData.find({});
                        const syncTimeout = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Sync timeout')), 3000)
                        );

                        const globals = await Promise.race([syncPromise, syncTimeout]);

                        globals.forEach(doc => {
                            const k = doc.key;
                            if (k === 'users') db.users = doc.data;
                            else if (k === 'fleets') db.fleets = doc.data;
                            else if (k === 'fuelData') db.fuelData = doc.data;
                            else if (k === 'euData') db.euData = doc.data;
                            else if (k === 'ciiConstants') db.ciiConstants = doc.data;
                            else if (k === 'euaManualData') db.euaManualData = doc.data;
                            else if (k === 'userData') db.userData = doc.data;
                            else if (k === 'traderContacts') db.traderContacts = doc.data;
                            else if (k === 'orders') db.orders = doc.data;
                            else if (k === 'trades') db.trades = doc.data;
                            else if (k === 'pools') db.pools = doc.data;
                            else if (k === 'emailConfig') db.emailConfig = doc.data;
                        });
                        console.log("MongoDB Sync Complete.");
                    } catch (e) {
                        console.error("MongoDB Sync Failed", e.message);
                        console.warn("Using in-memory defaults due to sync failure");
                    }
                } else {
                    console.warn("MongoDB connection failed or timed out, using in-memory defaults");
                }
            } catch (mongoError) {
                console.error("MongoDB connection error:", mongoError.message);
                console.warn("Continuing with in-memory storage");
            }
        } else {
            console.warn("MONGO_URI not set, using in-memory defaults");
        }


        // Rebuild Volume Cache
        db.trades.forEach(t => {
            if (t.type === 'MATCH' || t.type === 'RFQ_MATCH') {
                if (!db.executedVolumes[t.symbol]) db.executedVolumes[t.symbol] = {};
                const pKey = parseFloat(t.price).toFixed(2);
                db.executedVolumes[t.symbol][pKey] = (db.executedVolumes[t.symbol][pKey] || 0) + t.quantity;
            }
        });

        // Mock Data init for fresh install if needed (Logic preserved from server.js)
        if (db.orders.length === 0 && db.trades.length === 0) {
            db.orders = [
                { id: 'ord_1', type: 'SELL', symbol: 'EUA', quantity: 5000, price: 85.50, owner: 'Market Maker', timestamp: Date.now() - 100000 },
                { id: 'ord_2', type: 'BUY', symbol: 'EUA', quantity: 2000, price: 82.00, owner: 'Market Maker', timestamp: Date.now() - 50000 }
            ];
            saveJSON(paths.ORDERS_FILE, db.orders);
        }

        // Always ensure admin and basic data structures exist
        _ensureAdminAndTraders();

        console.log("Store: All data loaded successfully.");
    } catch (error) {
        console.error("CRITICAL Error in loadAll:", error);
        console.error("Error stack:", error.stack);
        // Even on error, ensure basic data structures exist
        try {
            _ensureAdminAndTraders();
            console.log("Recovered with fallback initialization");
        } catch (fallbackError) {
            console.error("Fallback initialization also failed:", fallbackError.message);
        }
        // Don't throw - allow server to continue with defaults
    }
}


function _ensureAdminAndTraders() {
    try {
        // Ensure users array exists
        if (!Array.isArray(db.users)) {
            db.users = [];
        }

        // Ensure Admin
        let adminUser = db.users.find(u => u.email === 'cfadmin@cofleeter.com');
        if (!adminUser) {
            adminUser = {
                id: 'admin_cf',
                role: 'ADMIN',
                email: 'cfadmin@cofleeter.com',
                password: '1234',
                name: 'Super Admin',
                company: 'Co-Fleeter',
                permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN
            };
            db.users.unshift(adminUser);
            saveJSON(paths.USERS_FILE, db.users);
            console.log("Store: Restored admin user.");
        }

        // Ensure Traders - REMOVED (Legacy seed data causing zombies)
        // Ensure Traders - REMOVED (Legacy seed data causing zombies)
        // Active Cleanup: Remove legacy traders if they still exist
        const legacyIds = ['trader_a', 'trader_b', 'trader_c'];
        const initialLength = db.users.length;
        db.users = db.users.filter(u => !legacyIds.includes(u.id));
        if (db.users.length !== initialLength) {
            saveJSON(paths.USERS_FILE, db.users);
            console.log("Store: Removed legacy traders (A, B, C).");
        }
    } catch (error) {
        console.error('Error in _ensureAdminAndTraders:', error.message);
    }
}


// --- Save Methods ---
const save = {
    users: () => { saveJSON(paths.USERS_FILE, db.users); saveToMongo('users', db.users); },
    fleets: () => { saveJSON(paths.FLEETS_FILE, db.fleets); saveToMongo('fleets', db.fleets); },
    fuelData: () => { saveJSON(paths.FUEL_DATA_FILE, db.fuelData); saveToMongo('fuelData', db.fuelData); },
    euData: () => {
        if (fs.existsSync(paths.EU_DATA_FILE)) fs.copyFileSync(paths.EU_DATA_FILE, paths.EU_DATA_FILE + '.backup');
        saveJSON(paths.EU_DATA_FILE, db.euData);
        saveToMongo('euData', db.euData);
    },
    ciiData: () => { saveJSON(paths.CII_DATA_FILE, db.ciiConstants); saveToMongo('ciiConstants', db.ciiConstants); },
    euaManual: () => { saveJSON(paths.EUA_MANUAL_FILE, db.euaManualData); saveToMongo('euaManualData', db.euaManualData); },
    euaSheet: () => { saveJSON(paths.EUA_SHEET_CACHE_FILE, db.euaSheetCache); },
    accessLogs: () => { saveJSON(paths.ACCESS_LOGS_FILE, db.accessLogs); },
    userData: () => { saveJSON(paths.USER_DATA_FILE, db.userData); saveToMongo('userData', db.userData); },
    traderContacts: () => { saveJSON(paths.TRADER_CONTACTS_FILE, db.traderContacts); saveToMongo('traderContacts', db.traderContacts); },
    trading: () => {
        saveJSON(paths.ORDERS_FILE, db.orders);
        saveJSON(paths.TRADES_FILE, db.trades);
        saveToMongo('orders', db.orders);
        saveToMongo('trades', db.trades);
    },
    pools: () => { saveJSON(paths.POOLS_FILE, db.pools); saveToMongo('pools', db.pools); },
    emailConfig: () => { saveJSON(paths.EMAIL_CONFIG_FILE, db.emailConfig); saveToMongo('emailConfig', db.emailConfig); }
};

// Helper function for DB status check (used by Admin badge)
function getStatus() {
    return mongo.mongoose ? mongo.mongoose.connection.readyState : 0;
}

module.exports = {
    db,
    loadAll,
    save,
    getStatus
};
