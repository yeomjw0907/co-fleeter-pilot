/**
 * Check Pending Orders (REQUESTED/REQUESTING status)
 * EUA and FEM orders that are stuck in pending state
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

async function checkPendingOrders() {
    console.log('🔍 Checking Pending Orders (REQUESTED/REQUESTING)\n');
    console.log(`🌐 Supabase URL: ${SUPABASE_URL}\n`);

    try {
        // Get all orders with REQUESTED or REQUESTING status
        const { data: pendingOrders, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['REQUESTED', 'REQUESTING']);

        if (error) {
            console.error('❌ Error fetching orders:', error.message);
            return;
        }

        if (!pendingOrders || pendingOrders.length === 0) {
            console.log('✅ No pending orders found!');
            return;
        }

        console.log(`⚠️  Found ${pendingOrders.length} pending order(s):\n`);

        // Group by symbol
        const bySymbol = {
            EUA: [],
            FEM: [],
            ETS: [],
            OTHER: []
        };

        pendingOrders.forEach(order => {
            const symbol = order.symbol || 'OTHER';
            if (bySymbol[symbol]) {
                bySymbol[symbol].push(order);
            } else {
                bySymbol.OTHER.push(order);
            }
        });

        // Display EUA orders
        if (bySymbol.EUA.length > 0) {
            console.log('📋 EUA Orders:');
            bySymbol.EUA.forEach(order => {
                console.log(`\n  Order ID: ${order.id}`);
                console.log(`    Status: ${order.status}`);
                console.log(`    Type: ${order.type}`);
                console.log(`    Owner: ${order.owner}`);
                console.log(`    Quantity: ${order.quantity}`);
                console.log(`    Price: €${order.price}`);
                console.log(`    Linked Order ID: ${order.linkedOrderId || 'None'}`);
                console.log(`    Timestamp: ${new Date(order.timestamp).toLocaleString()}`);
            });
        }

        // Display FEM orders
        if (bySymbol.FEM.length > 0) {
            console.log('\n📋 FEM Orders:');
            bySymbol.FEM.forEach(order => {
                console.log(`\n  Order ID: ${order.id}`);
                console.log(`    Status: ${order.status}`);
                console.log(`    Type: ${order.type}`);
                console.log(`    Owner: ${order.owner}`);
                console.log(`    Quantity: ${order.quantity}`);
                console.log(`    Price: €${order.price}`);
                console.log(`    Linked Order ID: ${order.linkedOrderId || 'None'}`);
                console.log(`    Timestamp: ${new Date(order.timestamp).toLocaleString()}`);
            });
        }

        // Check for broken links
        console.log('\n🔗 Checking for broken links...');
        const brokenLinks = [];
        pendingOrders.forEach(order => {
            if (order.linkedOrderId) {
                const linkedOrder = pendingOrders.find(o => o.id === order.linkedOrderId);
                if (!linkedOrder) {
                    brokenLinks.push({
                        orderId: order.id,
                        linkedOrderId: order.linkedOrderId,
                        status: order.status
                    });
                }
            }
        });

        if (brokenLinks.length > 0) {
            console.log(`\n⚠️  Found ${brokenLinks.length} order(s) with broken links:`);
            brokenLinks.forEach(link => {
                console.log(`  - Order ${link.orderId} (${link.status}) links to non-existent order ${link.linkedOrderId}`);
            });
        } else {
            console.log('✅ All links are valid');
        }

        // Summary
        console.log('\n📊 Summary:');
        console.log(`   Total Pending: ${pendingOrders.length}`);
        console.log(`   EUA: ${bySymbol.EUA.length}`);
        console.log(`   FEM: ${bySymbol.FEM.length}`);
        console.log(`   REQUESTED: ${pendingOrders.filter(o => o.status === 'REQUESTED').length}`);
        console.log(`   REQUESTING: ${pendingOrders.filter(o => o.status === 'REQUESTING').length}`);
        console.log(`   Broken Links: ${brokenLinks.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

checkPendingOrders()
    .then(() => {
        console.log('\n✅ Check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Check failed:', error);
        process.exit(1);
    });
