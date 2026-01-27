const { createClient } = require('@supabase/supabase-js');

// --- Supabase Client Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

// --- Connection ---
const connectSupabase = () => {
    try {
        // Check if already connected
        if (supabase) {
            console.log("Supabase client already initialized");
            return supabase;
        }

        // Validate environment variables
        if (!supabaseUrl || !supabaseServiceKey) {
            console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
            return null;
        }

        // Create Supabase client with service role key
        // Service role key bypasses Row Level Security (RLS)
        supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log("✅ Supabase client initialized successfully");
        return supabase;
    } catch (error) {
        console.error("❌ Supabase initialization error:", error.message);
        return null;
    }
};

// --- Helper Functions ---

/**
 * Get Supabase client instance
 * @returns {Object|null} Supabase client or null
 */
const getClient = () => {
    if (!supabase) {
        return connectSupabase();
    }
    return supabase;
};

/**
 * Test Supabase connection
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
    try {
        const client = getClient();
        if (!client) {
            return false;
        }

        // Try to query users table
        const { error } = await client
            .from('users')
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error("Supabase connection test failed:", error.message);
            return false;
        }

        console.log("✅ Supabase connection test passed");
        return true;
    } catch (error) {
        console.error("Supabase connection test error:", error.message);
        return false;
    }
};

/**
 * Check if Supabase is connected
 * @returns {boolean}
 */
const isConnected = () => {
    return supabase !== null;
};

// --- Data Operations Helpers ---

/**
 * Save data to global_data table (key-value store)
 * @param {string} key - Data key
 * @param {any} data - Data to store (will be JSON stringified)
 * @returns {Promise<boolean>}
 */
const saveGlobalData = async (key, data) => {
    try {
        const client = getClient();
        if (!client) {
            console.error("Supabase client not initialized");
            return false;
        }

        const { error } = await client
            .from('global_data')
            .upsert({
                key: key,
                data: data,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error(`Supabase save error [${key}]:`, error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Supabase save error [${key}]:`, error.message);
        return false;
    }
};

/**
 * Load data from global_data table
 * @param {string} key - Data key
 * @returns {Promise<any|null>}
 */
const loadGlobalData = async (key) => {
    try {
        const client = getClient();
        if (!client) {
            console.error("Supabase client not initialized");
            return null;
        }

        const { data, error } = await client
            .from('global_data')
            .select('data')
            .eq('key', key)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found - not an error
                return null;
            }
            console.error(`Supabase load error [${key}]:`, error.message);
            return null;
        }

        return data ? data.data : null;
    } catch (error) {
        console.error(`Supabase load error [${key}]:`, error.message);
        return null;
    }
};

/**
 * Load all data from global_data table
 * @returns {Promise<Object>}
 */
const loadAllGlobalData = async () => {
    try {
        const client = getClient();
        if (!client) {
            console.error("Supabase client not initialized");
            return {};
        }

        const { data, error } = await client
            .from('global_data')
            .select('key, data');

        if (error) {
            console.error("Supabase load all error:", error.message);
            return {};
        }

        // Convert array to object { key: data }
        const result = {};
        if (data) {
            data.forEach(item => {
                result[item.key] = item.data;
            });
        }

        return result;
    } catch (error) {
        console.error("Supabase load all error:", error.message);
        return {};
    }
};

/**
 * Save users to users table
 * @param {Array} users - Array of user objects
 * @returns {Promise<boolean>}
 */
const saveUsers = async (users) => {
    try {
        const client = getClient();
        if (!client || !Array.isArray(users)) return false;

        // Delete existing users and insert new ones
        await client.from('users').delete().neq('id', '');
        
        const { error } = await client.from('users').insert(users);
        if (error) {
            console.error('Supabase save users error:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Supabase save users error:', error.message);
        return false;
    }
};

/**
 * Load users from users table
 * @returns {Promise<Array>}
 */
const loadUsers = async () => {
    try {
        const client = getClient();
        if (!client) return [];

        const { data, error } = await client.from('users').select('*');
        if (error) {
            console.error('Supabase load users error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('Supabase load users error:', error.message);
        return [];
    }
};

/**
 * Save fleets to fleets table
 * @param {Object} fleets - Object with userId as key and ships array as value
 * @returns {Promise<boolean>}
 */
const saveFleets = async (fleets) => {
    try {
        const client = getClient();
        if (!client || !fleets) return false;

        // Delete existing fleets
        await client.from('fleets').delete().neq('user_id', '');

        // Convert object to array of fleet records
        const fleetRecords = Object.entries(fleets).map(([userId, ships]) => ({
            user_id: userId,
            ships: ships
        }));

        if (fleetRecords.length === 0) return true;

        const { error } = await client.from('fleets').insert(fleetRecords);
        if (error) {
            console.error('Supabase save fleets error:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Supabase save fleets error:', error.message);
        return false;
    }
};

/**
 * Load fleets from fleets table
 * @returns {Promise<Object>}
 */
const loadFleets = async () => {
    try {
        const client = getClient();
        if (!client) return {};

        const { data, error } = await client.from('fleets').select('*');
        if (error) {
            console.error('Supabase load fleets error:', error.message);
            return {};
        }

        // Convert array to object { userId: ships }
        const result = {};
        if (data) {
            data.forEach(fleet => {
                result[fleet.user_id] = fleet.ships || [];
            });
        }
        return result;
    } catch (error) {
        console.error('Supabase load fleets error:', error.message);
        return {};
    }
};

/**
 * Save orders to orders table
 * @param {Array} orders - Array of order objects
 * @returns {Promise<boolean>}
 */
const saveOrders = async (orders) => {
    try {
        const client = getClient();
        if (!client || !Array.isArray(orders)) return false;

        await client.from('orders').delete().neq('id', '');
        
        if (orders.length === 0) return true;

        const { error } = await client.from('orders').insert(orders);
        if (error) {
            console.error('Supabase save orders error:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Supabase save orders error:', error.message);
        return false;
    }
};

/**
 * Load orders from orders table
 * @returns {Promise<Array>}
 */
const loadOrders = async () => {
    try {
        const client = getClient();
        if (!client) return [];

        const { data, error } = await client.from('orders').select('*');
        if (error) {
            console.error('Supabase load orders error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('Supabase load orders error:', error.message);
        return [];
    }
};

/**
 * Save trades to trades table
 * @param {Array} trades - Array of trade objects
 * @returns {Promise<boolean>}
 */
const saveTrades = async (trades) => {
    try {
        const client = getClient();
        if (!client || !Array.isArray(trades)) return false;

        await client.from('trades').delete().neq('id', '');
        
        if (trades.length === 0) return true;

        const { error } = await client.from('trades').insert(trades);
        if (error) {
            console.error('Supabase save trades error:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Supabase save trades error:', error.message);
        return false;
    }
};

/**
 * Load trades from trades table
 * @returns {Promise<Array>}
 */
const loadTrades = async () => {
    try {
        const client = getClient();
        if (!client) return [];

        const { data, error } = await client.from('trades').select('*');
        if (error) {
            console.error('Supabase load trades error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('Supabase load trades error:', error.message);
        return [];
    }
};

/**
 * Save user data to user_data table
 * @param {Object} userData - Object with userId as key and data as value
 * @returns {Promise<boolean>}
 */
const saveUserData = async (userData) => {
    try {
        const client = getClient();
        if (!client || !userData) return false;

        await client.from('user_data').delete().neq('user_id', '');

        const userDataRecords = Object.entries(userData).map(([userId, data]) => ({
            user_id: userId,
            calculations: data.calculations || []
        }));

        if (userDataRecords.length === 0) return true;

        const { error } = await client.from('user_data').insert(userDataRecords);
        if (error) {
            console.error('Supabase save user_data error:', error.message);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Supabase save user_data error:', error.message);
        return false;
    }
};

/**
 * Load user data from user_data table
 * @returns {Promise<Object>}
 */
const loadUserData = async () => {
    try {
        const client = getClient();
        if (!client) return {};

        const { data, error } = await client.from('user_data').select('*');
        if (error) {
            console.error('Supabase load user_data error:', error.message);
            return {};
        }

        const result = {};
        if (data) {
            data.forEach(item => {
                result[item.user_id] = {
                    calculations: item.calculations || []
                };
            });
        }
        return result;
    } catch (error) {
        console.error('Supabase load user_data error:', error.message);
        return {};
    }
};

module.exports = {
    connectSupabase,
    getClient,
    testConnection,
    isConnected,
    saveGlobalData,
    loadGlobalData,
    loadAllGlobalData,
    // Normalized table operations
    saveUsers,
    loadUsers,
    saveFleets,
    loadFleets,
    saveOrders,
    loadOrders,
    saveTrades,
    loadTrades,
    saveUserData,
    loadUserData
};
