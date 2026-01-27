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

module.exports = {
    connectSupabase,
    getClient,
    testConnection,
    isConnected,
    saveGlobalData,
    loadGlobalData,
    loadAllGlobalData
};
