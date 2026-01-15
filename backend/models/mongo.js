const mongoose = require('mongoose');

// --- Schemas ---
const UserSchema = new mongoose.Schema({}, { strict: false }); // Store user objects freely
const FleetSchema = new mongoose.Schema({ userId: String, ships: Array });
const GlobalDataSchema = new mongoose.Schema({ key: String, data: mongoose.Schema.Types.Mixed }); // Generic store for single objects like fuelData

// --- Models (Serverless-safe: reuse existing models to prevent OverwriteModelError) ---
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Fleet = mongoose.models.Fleet || mongoose.model('Fleet', FleetSchema);
const GlobalData = mongoose.models.GlobalData || mongoose.model('GlobalData', GlobalDataSchema);

// --- Connection ---
const connectDB = async (uri) => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log("MongoDB already connected");
            return true;
        }

        // Connection options
        const isProduction = process.env.NODE_ENV === 'production';
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4 // Force IPv4
        };

        if (isProduction) {
            options.maxPoolSize = 1;
            options.minPoolSize = 1;
            options.bufferMaxEntries = 0;
            options.bufferCommands = false;
        }

        await mongoose.connect(uri, options);
        console.log("MongoDB Connected Successfully");
        return true;
    } catch (e) {
        console.error("MongoDB Connection Error:", e.message);
        console.error("Error details:", e.name, e.code);
        return false;
    }
};

module.exports = {
    connectDB,
    User,
    Fleet,
    GlobalData,
    mongoose // Export mongoose instance
};
