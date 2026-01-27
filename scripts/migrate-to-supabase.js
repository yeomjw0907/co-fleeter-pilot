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
        
        console.log(`  ✅ ${key}: Migrated successfully`);
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
    
    // Migrate to Supabase global_data table
    console.log('3️⃣ Migrating data to Supabase...');
    let successCount = 0;
    let failCount = 0;
    
    for (const [key, value] of Object.entries(data)) {
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
    console.log(`   Skipped: ${Object.keys(data).length - successCount - failCount}`);
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
