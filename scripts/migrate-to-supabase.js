/**
 * Co-Fleeter Migration Script
 * Migrate data from local JSON files to Supabase
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js
 * 
 * Requirements:
 *   - .env file with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *   - Supabase tables must be created first (run SQL schema)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// --- Data Paths ---
const DATA_DIR = path.join(__dirname, '../backend/data');
const dataFiles = {
    users: path.join(DATA_DIR, 'users.json'),
    fleets: path.join(DATA_DIR, 'fleets.json'),
    orders: path.join(DATA_DIR, 'orders.json'),
    trades: path.join(DATA_DIR, 'trades.json'),
    pools: path.join(DATA_DIR, 'pools.json'),
    fuelData: path.join(DATA_DIR, 'fuel_data.json'),
    euData: path.join(DATA_DIR, 'eu_data.json'),
    ciiConstants: path.join(DATA_DIR, 'cii_constants.json'),
    euaManualData: path.join(DATA_DIR, 'eua_manual_data.json'),
    userData: path.join(DATA_DIR, 'user_data.json'),
    traderContacts: path.join(DATA_DIR, 'trader_contacts.json'),
    emailConfig: path.join(DATA_DIR, 'email_config.json')
};

// --- Helper Functions ---
function loadJSON(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(raw);
        } catch (e) {
            console.warn(`⚠️  Failed to load ${filePath}:`, e.message);
            return null;
        }
    }
    return null;
}

// Save to normalized tables (users, fleets, orders, trades, user_data)
async function saveToNormalizedTable(tableName, data) {
    if (!data) {
        console.log(`  ⏭️  ${tableName}: No data to migrate`);
        return false;
    }
    
    try {
        // Delete existing data
        await supabase.from(tableName).delete().neq('id', '');
        
        let records = [];
        
        // Convert data based on table type
        if (tableName === 'fleets') {
            // fleets: { userId: [ships] } → [{ user_id, ships }]
            records = Object.entries(data).map(([userId, ships]) => ({
                user_id: userId,
                ships: ships
            }));
        } else if (tableName === 'user_data') {
            // userData: { userId: { calculations } } → [{ user_id, calculations }]
            records = Object.entries(data).map(([userId, userData]) => ({
                user_id: userId,
                calculations: userData.calculations || []
            }));
        } else if (tableName === 'users') {
            // users: clean and ensure all required fields
            records = data.map(user => ({
                id: user.id,
                email: user.email,
                password: user.password,
                name: user.name,
                company: user.company,
                role: user.role || 'USER',
                permissions: user.permissions || [],
                id_custom: user.id_custom || null,
                phone: user.phone || null,
                created_at: user.created_at || new Date().toISOString()
            }));
        } else if (tableName === 'orders') {
            // orders: ensure all fields including linkedOrderId
            records = data.map(order => ({
                id: order.id,
                timestamp: order.timestamp,
                quotes: order.quotes || {},
                status: order.status || 'OPEN',
                symbol: order.symbol,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                owner: order.owner,
                ownerCompany: order.ownerCompany || '',
                linkedOrderId: order.linkedOrderId || null,
                created_at: order.created_at || new Date(order.timestamp).toISOString()
            }));
        } else {
            // trades: already in array format
            records = data;
        }
        
        if (records.length === 0) {
            console.log(`  ⏭️  ${tableName}: No records to insert`);
            return true;
        }
        
        const { error } = await supabase.from(tableName).insert(records);
        
        if (error) {
            console.error(`  ❌ ${tableName}: Error -`, error.message);
            console.error(`     Details:`, error.details);
            console.error(`     Hint:`, error.hint);
            return false;
        }
        
        console.log(`  ✅ ${tableName}: Migrated ${records.length} record(s)`);
        return true;
    } catch (error) {
        console.error(`  ❌ ${tableName}: Exception -`, error.message);
        return false;
    }
}

// Save to global_data table (for config and reference data)
async function saveToGlobalData(key, data) {
    if (!data) {
        console.log(`  ⏭️  ${key}: No data to migrate`);
        return false;
    }
    
    try {
        const { error } = await supabase
            .from('global_data')
            .upsert({
                key: key,
                data: data,
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error(`  ❌ ${key}: Error -`, error.message);
            return false;
        }
        
        console.log(`  ✅ ${key}: Migrated to global_data`);
        return true;
    } catch (error) {
        console.error(`  ❌ ${key}: Exception -`, error.message);
        return false;
    }
}

async function testConnection() {
    try {
        const { error } = await supabase
            .from('global_data')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            return false;
        }
        
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection error:', error.message);
        return false;
    }
}

// --- Migration Function ---
async function migrate() {
    console.log('🚀 Starting Migration: Local JSON → Supabase\n');
    console.log(`📁 Data directory: ${DATA_DIR}`);
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}\n`);
    
    // Test connection
    console.log('1️⃣ Testing Supabase connection...');
    const connected = await testConnection();
    if (!connected) {
        console.error('\n❌ Migration failed: Cannot connect to Supabase');
        console.error('   Please check:');
        console.error('   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
        console.error('   - Supabase project is running');
        console.error('   - Tables are created (run SQL schema first)');
        process.exit(1);
    }
    console.log('');
    
    // Load and migrate data
    console.log('2️⃣ Loading local data files...');
    const data = {
        users: loadJSON(dataFiles.users),
        fleets: loadJSON(dataFiles.fleets),
        orders: loadJSON(dataFiles.orders),
        trades: loadJSON(dataFiles.trades),
        pools: loadJSON(dataFiles.pools),
        fuelData: loadJSON(dataFiles.fuelData),
        euData: loadJSON(dataFiles.euData),
        ciiConstants: loadJSON(dataFiles.ciiConstants),
        euaManualData: loadJSON(dataFiles.euaManualData),
        userData: loadJSON(dataFiles.userData),
        traderContacts: loadJSON(dataFiles.traderContacts),
        emailConfig: loadJSON(dataFiles.emailConfig)
    };
    console.log('');
    
    // Migrate to Supabase normalized tables
    console.log('3️⃣ Migrating data to Supabase normalized tables...');
    let successCount = 0;
    let failCount = 0;
    
    // Migrate users first
    console.log('  → Migrating users...');
    const usersSuccess = await saveToNormalizedTable('users', data.users);
    if (usersSuccess) successCount++; else failCount++;
    
    // Get valid user IDs from users table
    const validUserIds = new Set((data.users || []).map(u => u.id));
    console.log(`  → Valid user IDs: ${validUserIds.size}`);
    
    // Filter fleets to only include valid user IDs
    const validFleets = {};
    if (data.fleets) {
        Object.entries(data.fleets).forEach(([userId, ships]) => {
            if (validUserIds.has(userId)) {
                validFleets[userId] = ships;
            } else {
                console.log(`  ⚠️  Skipping fleet for non-existent user: ${userId}`);
            }
        });
    }
    
    // Filter userData to only include valid user IDs
    const validUserData = {};
    if (data.userData) {
        Object.entries(data.userData).forEach(([userId, userData]) => {
            if (validUserIds.has(userId)) {
                validUserData[userId] = userData;
            } else {
                console.log(`  ⚠️  Skipping user_data for non-existent user: ${userId}`);
            }
        });
    }
    
    // Migrate other normalized tables
    console.log('  → Migrating fleets...');
    const fleetsSuccess = await saveToNormalizedTable('fleets', validFleets);
    if (fleetsSuccess) successCount++; else failCount++;
    
    console.log('  → Migrating orders...');
    const ordersSuccess = await saveToNormalizedTable('orders', data.orders);
    if (ordersSuccess) successCount++; else failCount++;
    
    console.log('  → Migrating trades...');
    const tradesSuccess = await saveToNormalizedTable('trades', data.trades);
    if (tradesSuccess) successCount++; else failCount++;
    
    console.log('  → Migrating user_data...');
    const userDataSuccess = await saveToNormalizedTable('user_data', validUserData);
    if (userDataSuccess) successCount++; else failCount++;
    
    console.log('');
    console.log('4️⃣ Migrating config data to global_data table...');
    
    // Migrate config data to global_data
    const globalDataKeys = {
        'fuelData': data.fuelData,
        'euData': data.euData,
        'ciiConstants': data.ciiConstants,
        'euaManualData': data.euaManualData,
        'traderContacts': data.traderContacts,
        'pools': data.pools,
        'emailConfig': data.emailConfig
    };
    
    for (const [key, value] of Object.entries(globalDataKeys)) {
        const success = await saveToGlobalData(key, value);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    console.log('');
    console.log('✅ Migration Complete!');
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Verify data in Supabase Dashboard (Table Editor)');
    console.log('   2. Update .env with Supabase credentials');
    console.log('   3. Test locally: npm start');
    console.log('   4. Deploy to Vercel');
}

// --- Run Migration ---
migrate()
    .then(() => {
        console.log('\n✅ Migration script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration failed with error:', error);
        console.error(error.stack);
        process.exit(1);
    });
