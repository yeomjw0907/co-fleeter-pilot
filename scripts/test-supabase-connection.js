/**
 * Test Supabase Connection and Table Structure
 * Verifies that all required tables exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testTables() {
    console.log('🧪 Testing Supabase Connection and Tables\n');
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}\n`);

    const tables = [
        'users',
        'fleets',
        'orders',
        'trades',
        'pools',
        'global_data',
        'user_data',
        'access_logs'
    ];

    let successCount = 0;
    let failCount = 0;

    for (const table of tables) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.log(`❌ ${table}: ${error.message}`);
                failCount++;
            } else {
                console.log(`✅ ${table}: Table exists and is accessible`);
                successCount++;
            }
        } catch (error) {
            console.log(`❌ ${table}: Exception - ${error.message}`);
            failCount++;
        }
    }

    console.log('\n📊 Results:');
    console.log(`   ✅ Success: ${successCount}/${tables.length}`);
    console.log(`   ❌ Failed: ${failCount}/${tables.length}`);

    if (failCount === 0) {
        console.log('\n🎉 All tables are ready! You can proceed with data migration.');
        return true;
    } else {
        console.log('\n⚠️  Some tables are missing or inaccessible.');
        console.log('   Please run the SQL schema in Supabase Dashboard first.');
        return false;
    }
}

testTables()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    });
