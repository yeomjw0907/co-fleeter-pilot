const fs = require('fs');
const paths = require('../config/paths');
const { INITIAL_CII_CONSTANTS } = require('../config/constants');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/constants');

// --- Database Adapters ---
// MongoDB (legacy, for migration)
const mongo = require('../models/mongo');
// Supabase (new)
const supabase = require('../models/supabase');

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

// --- persistence internal helpers for Supabase ---
async function saveToSupabase(key, data) {
    try {
        await supabase.saveGlobalData(key, data);
    } catch (e) {
        console.error(`Supabase Save Error [${key}]`, e);
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

        // 2. Try Supabase Connection (primary database)
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log("📡 Connecting to Supabase...");
            console.log("  URL:", process.env.SUPABASE_URL.substring(0, 30) + '...');
            try {
                const client = supabase.connectSupabase();
                
                if (client) {
                    console.log("📊 Loading data from Supabase...");
                    try {
                        // Test connection first with timeout
                        const testPromise = supabase.testConnection();
                        const timeout = new Promise((resolve) => setTimeout(() => {
                            console.warn('⚠️ Supabase connection test timeout (5s)');
                            resolve(false);
                        }, 5000));
                        
                        const connected = await Promise.race([testPromise, timeout]);
                        
                        if (connected) {
                            // Load data from normalized tables
                            console.log("📊 Loading from normalized tables...");
                            
                            // Load users from users table
                            const users = await supabase.loadUsers();
                            if (users && users.length > 0) {
                                db.users = users;
                                console.log(`  ✅ Loaded ${users.length} users`);
                            }
                            
                            // Load fleets from fleets table
                            const fleets = await supabase.loadFleets();
                            if (fleets && Object.keys(fleets).length > 0) {
                                db.fleets = fleets;
                                console.log(`  ✅ Loaded fleets for ${Object.keys(fleets).length} users`);
                            }
                            
                            // Load orders from orders table
                            const orders = await supabase.loadOrders();
                            if (orders && orders.length > 0) {
                                db.orders = orders;
                                console.log(`  ✅ Loaded ${orders.length} orders`);
                            }
                            
                            // Load trades from trades table
                            const trades = await supabase.loadTrades();
                            if (trades && trades.length > 0) {
                                db.trades = trades;
                                console.log(`  ✅ Loaded ${trades.length} trades`);
                            }
                            
                            // Load user_data from user_data table
                            const userData = await supabase.loadUserData();
                            if (userData && Object.keys(userData).length > 0) {
                                db.userData = userData;
                                console.log(`  ✅ Loaded user data for ${Object.keys(userData).length} users`);
                            }
                            
                            // Load other data from global_data table (fuelData, euData, etc.)
                            const globalData = await supabase.loadAllGlobalData();
                            if (globalData.fuelData) db.fuelData = globalData.fuelData;
                            if (globalData.euData) db.euData = globalData.euData;
                            if (globalData.ciiConstants) db.ciiConstants = globalData.ciiConstants;
                            if (globalData.euaManualData) db.euaManualData = globalData.euaManualData;
                            if (globalData.traderContacts) db.traderContacts = globalData.traderContacts;
                            if (globalData.pools) db.pools = globalData.pools;
                            if (globalData.emailConfig) db.emailConfig = globalData.emailConfig;
                            
                            console.log("✅ Supabase data loaded successfully");
                        } else {
                            console.warn("⚠️ Supabase connection test failed, using in-memory defaults");
                        }
                    } catch (loadError) {
                        console.error("❌ Supabase load error:", loadError.message);
                        console.error("   Stack:", loadError.stack);
                        console.warn("⚠️ Using in-memory defaults due to load failure");
                    }
                } else {
                    console.error("❌ Supabase client initialization failed");
                    console.warn("⚠️ Using in-memory defaults");
                }
            } catch (supabaseError) {
                console.error("❌ Supabase connection error:", supabaseError.message);
                console.error("   Stack:", supabaseError.stack);
                console.warn("⚠️ Continuing with in-memory storage");
            }
        } else {
            console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
            console.error("   SUPABASE_URL:", process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
            console.error("   SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
            console.warn("⚠️ Using in-memory defaults");
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
    users: () => { 
        saveJSON(paths.USERS_FILE, db.users); 
        supabase.saveUsers(db.users); 
    },
    fleets: () => { 
        saveJSON(paths.FLEETS_FILE, db.fleets); 
        supabase.saveFleets(db.fleets); 
    },
    fuelData: () => { 
        saveJSON(paths.FUEL_DATA_FILE, db.fuelData); 
        saveToSupabase('fuelData', db.fuelData); 
    },
    euData: () => {
        if (fs.existsSync(paths.EU_DATA_FILE)) fs.copyFileSync(paths.EU_DATA_FILE, paths.EU_DATA_FILE + '.backup');
        saveJSON(paths.EU_DATA_FILE, db.euData);
        saveToSupabase('euData', db.euData);
    },
    ciiData: () => { 
        saveJSON(paths.CII_DATA_FILE, db.ciiConstants); 
        saveToSupabase('ciiConstants', db.ciiConstants); 
    },
    euaManual: () => { 
        saveJSON(paths.EUA_MANUAL_FILE, db.euaManualData); 
        saveToSupabase('euaManualData', db.euaManualData); 
    },
    euaSheet: () => { 
        saveJSON(paths.EUA_SHEET_CACHE_FILE, db.euaSheetCache); 
    },
    accessLogs: () => { 
        saveJSON(paths.ACCESS_LOGS_FILE, db.accessLogs); 
    },
    userData: () => { 
        saveJSON(paths.USER_DATA_FILE, db.userData); 
        supabase.saveUserData(db.userData); 
    },
    traderContacts: () => { 
        saveJSON(paths.TRADER_CONTACTS_FILE, db.traderContacts); 
        saveToSupabase('traderContacts', db.traderContacts); 
    },
    trading: () => {
        saveJSON(paths.ORDERS_FILE, db.orders);
        saveJSON(paths.TRADES_FILE, db.trades);
        supabase.saveOrders(db.orders);
        supabase.saveTrades(db.trades);
    },
    pools: () => { 
        saveJSON(paths.POOLS_FILE, db.pools); 
        saveToSupabase('pools', db.pools); 
    },
    emailConfig: () => { 
        saveJSON(paths.EMAIL_CONFIG_FILE, db.emailConfig); 
        saveToSupabase('emailConfig', db.emailConfig); 
    }
};

// Helper function for DB status check (used by Admin badge)
function getStatus() {
    // Return 1 if Supabase is connected, 0 otherwise
    return supabase.isConnected() ? 1 : 0;
}

module.exports = {
    db,
    loadAll,
    save,
    getStatus
};
