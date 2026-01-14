const mongoose = require('mongoose');

// --- Schemas ---
const UserSchema = new mongoose.Schema({}, { strict: false }); // Store user objects freely
const FleetSchema = new mongoose.Schema({ userId: String, ships: Array });
const GlobalDataSchema = new mongoose.Schema({ key: String, data: mongoose.Schema.Types.Mixed }); // Generic store for single objects like fuelData

// --- Models ---
const User = mongoose.model('User', UserSchema);
const Fleet = mongoose.model('Fleet', FleetSchema);
const GlobalData = mongoose.model('GlobalData', GlobalDataSchema);

// --- Connection ---
const connectDB = async (uri) => {
    try {
        // Check if already connected
        if (mongoose.connection.readyState === 1) {
            console.log("MongoDB already connected");
            return true;
        }
        
        // Connection options for Vercel Serverless
        const options = {
            serverSelectionTimeoutMS: 5000, // 5초 타임아웃
            socketTimeoutMS: 45000,
            connectTimeoutMS: 5000,
            maxPoolSize: 1, // Serverless에서는 1개 연결만 사용
            minPoolSize: 1,
            bufferMaxEntries: 0, // Disable mongoose buffering
            bufferCommands: false,
        };
        
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
    GlobalData
};
