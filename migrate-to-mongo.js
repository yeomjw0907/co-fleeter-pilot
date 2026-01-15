
/**
 * 로컬 JSON 데이터를 MongoDB로 마이그레이션하는 일회성 스크립트
 * 실행: node migrate-to-mongo.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'backend', 'data');

// MongoDB 스키마 (GlobalData 사용)
const GlobalDataSchema = new mongoose.Schema({ key: String, data: mongoose.Schema.Types.Mixed }, { strict: false });
const GlobalData = mongoose.models.GlobalData || mongoose.model('GlobalData', GlobalDataSchema);

async function loadJSON(filename) {
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            console.warn(`Failed to load ${filename}:`, e.message);
        }
    }
    return null;
}

async function saveToMongo(key, data) {
    if (!data) {
        console.log(`  ⏭️  ${key}: No data to migrate`);
        return;
    }
    await GlobalData.updateOne({ key }, { key, data }, { upsert: true });
    console.log(`  ✅ ${key}: Migrated successfully`);
}

async function migrate() {
    console.log('🚀 Starting Migration: Local JSON → MongoDB\n');
    console.log(`   URI: ${process.env.MONGO_URI?.substring(0, 30)}...`);

    if (!process.env.MONGO_URI) {
        console.error('❌ MONGO_URI not found in .env file!');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            family: 4
        });
        console.log('✅ Connected to MongoDB\n');

        // 마이그레이션할 데이터 목록
        const migrations = [
            { file: 'users.json', key: 'users' },
            { file: 'fleets.json', key: 'fleets' },
            { file: 'fuelData.json', key: 'fuelData' },
            { file: 'euData.json', key: 'euData' },
            { file: 'ciiData.json', key: 'ciiConstants' },
            { file: 'euaManual.json', key: 'euaManualData' },
            { file: 'userData.json', key: 'userData' },
            { file: 'traderContacts.json', key: 'traderContacts' },
            { file: 'orders.json', key: 'orders' },
            { file: 'trades.json', key: 'trades' },
            { file: 'pools.json', key: 'pools' },
            { file: 'emailConfig.json', key: 'emailConfig' }
        ];

        console.log('📦 Migrating data...');
        for (const { file, key } of migrations) {
            const data = await loadJSON(file);
            await saveToMongo(key, data);
        }

        console.log('\n✅ Migration Complete!');
        console.log('   MongoDB에서 데이터를 확인해 보세요.');

    } catch (e) {
        console.error('❌ Migration Failed:', e.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

migrate();
