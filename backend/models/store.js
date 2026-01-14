const fs = require('fs');
const path = require('path');
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
        ETS: {
            "Trader A": { name: "", email: "", company: "", phone: "" },
            "Trader B": { name: "", email: "", company: "", phone: "" },
            "Trader C": { name: "", email: "", company: "", phone: "" }
        },
        FuelEU: {
            "AA Trader": { name: "", email: "", company: "", phone: "" },
            "BB Trader": { name: "", email: "", company: "", phone: "" },
            "CC Trader": { name: "", email: "", company: "", phone: "" }
        }
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
        // Check if file exists and is writable
        if (fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } else {
            // Try to create directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        return true;
    } catch (e) {
        // Don't throw error, just log it
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
            // In production, initialize with empty defaults
            console.log('Production mode: Skipping file system reads');
        }

        // 2. Try MongoDB Connection
        if (process.env.MONGO_URI) {
            console.log("Connecting to MongoDB...");
            try {
                const connected = await mongo.connectDB(process.env.MONGO_URI);
                if (connected) {
                    console.log("Syncing data from MongoDB...");
                    try {
                        // Fetch All Globals
                        const globals = await mongo.GlobalData.find({});
                        globals.forEach(doc => {
                            const k = doc.key;
                            if (k === 'users') db.users = doc.data; // Using Global for users too to avoid schema conflicts in hybrid
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
                        console.error("MongoDB Sync Failed", e);
                        // Don't throw, continue with defaults
                    }
                } else {
                    console.warn("MongoDB connection failed, using defaults");
                }
            } catch (mongoError) {
                console.error("MongoDB connection error:", mongoError.message);
                // Don't throw, continue with defaults
            }
        } else {
            console.warn("MONGO_URI not set, using in-memory defaults");
        }

        // Rebuild Volume Cache
        if (Array.isArray(db.trades)) {
            db.trades.forEach(t => {
                if (t.type === 'MATCH' || t.type === 'RFQ_MATCH') {
                    if (!db.executedVolumes[t.symbol]) db.executedVolumes[t.symbol] = {};
                    const pKey = parseFloat(t.price).toFixed(2);
                    db.executedVolumes[t.symbol][pKey] = (db.executedVolumes[t.symbol][pKey] || 0) + t.quantity;
                }
            });
        }

        // Mock Data init for fresh install if needed (Logic preserved from server.js)
        if (db.orders.length === 0 && db.trades.length === 0) {
            db.orders = [
                { id: 'ord_1', type: 'SELL', symbol: 'EUA', quantity: 5000, price: 85.50, owner: 'Market Maker', timestamp: Date.now() - 100000 },
                { id: 'ord_2', type: 'BUY', symbol: 'EUA', quantity: 2000, price: 82.00, owner: 'Market Maker', timestamp: Date.now() - 50000 }
            ];
            if (process.env.NODE_ENV !== 'production') {
                saveJSON(paths.ORDERS_FILE, db.orders);
            }
        }

        _ensureAdminAndTraders();

        console.log("Store: All data loaded.");
    } catch (error) {
        console.error("Error in loadAll:", error);
        console.error("Error stack:", error.stack);
        // Ensure admin user exists even if loading fails
        _ensureAdminAndTraders();
        throw error; // Re-throw to let caller handle
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
            if (process.env.NODE_ENV !== 'production') {
                saveJSON(paths.USERS_FILE, db.users);
            }
            // Save to MongoDB if connected
            if (process.env.MONGO_URI && mongo.mongoose && mongo.mongoose.connection.readyState === 1) {
                saveToMongo('users', db.users).catch(err => console.error('Failed to save users to MongoDB:', err));
            }
            console.log("Store: Restored admin user.");
        }

        // Ensure Traders
        const traders = [
            { id: 'trader_a', email: 'atrader@cofleeter.com', name: 'A Trader' },
            { id: 'trader_b', email: 'btrader@cofleeter.com', name: 'B Trader' },
            { id: 'trader_c', email: 'ctrader@cofleeter.com', name: 'C Trader' }
        ];
        let tradersAdded = false;
        traders.forEach(t => {
            if (!db.users.find(u => u.email === t.email)) {
                db.users.push({
                    id: t.id,
                    role: 'TRADER',
                    email: t.email,
                    password: '1234',
                    name: t.name,
                    company: 'Co-Fleeter Traders',
                    permissions: DEFAULT_ROLE_PERMISSIONS.TRADER
                });
                tradersAdded = true;
            }
        });
        if (tradersAdded) {
            if (process.env.NODE_ENV !== 'production') {
                saveJSON(paths.USERS_FILE, db.users);
            }
            // Save to MongoDB if connected
            if (process.env.MONGO_URI && mongo.mongoose && mongo.mongoose.connection.readyState === 1) {
                saveToMongo('users', db.users).catch(err => console.error('Failed to save users to MongoDB:', err));
            }
        }
    } catch (error) {
        console.error('Error in _ensureAdminAndTraders:', error);
        // Don't throw, just log
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
    euaSheet: () => { saveJSON(paths.EUA_SHEET_CACHE_FILE, db.euaSheetCache); }, // Cache usually not synced but let's leave it file only
    accessLogs: () => { saveJSON(paths.ACCESS_LOGS_FILE, db.accessLogs); }, // logs file only
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

module.exports = {
    db,
    loadAll,
    save
};
