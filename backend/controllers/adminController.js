

const { db, save, getStatus } = require('../models/store');
const mongoose = require('mongoose'); // Import mongoose directly
const dataService = require('../services/dataService');
const emailService = require('../services/emailService');
const logService = require('../services/logService');

exports.getDbStatus = (req, res) => {
    let status = 'disconnected';
    let state = 0;

    // Check via store's getStatus if available (primary) or local mongoose (fallback)
    if (getStatus) {
        state = getStatus();
    } else if (mongoose.connection) {
        state = mongoose.connection.readyState;
    }

    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (state === 1) status = 'connected';
    else if (state === 2) status = 'connecting';

    res.json({ success: true, status, state });
};

exports.getUsers = (req, res) => {
    const safeUsers = db.users.map(u => {
        const { password, ...rest } = u;
        return rest;
    });
    res.json({ success: true, users: safeUsers });
};

exports.updatePermissions = (req, res) => {
    const { targetUserId, permissions } = req.body;
    const user = db.users.find(u => u.id === targetUserId);
    if (user) {
        user.permissions = permissions;
        save.users();
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
};

exports.resetPassword = (req, res) => {
    const { targetUserId } = req.body;
    const user = db.users.find(u => u.id === targetUserId);
    if (user) {
        user.password = 'cofleeter1234!';
        save.users();
        res.json({ success: true, message: 'Password reset' });
    } else {
        res.status(404).json({ success: false });
    }
};

exports.getEmailConfig = (req, res) => {
    res.set('Cache-Control', 'no-store');
    const safe = { ...db.emailConfig };
    if (safe.auth && safe.auth.pass) safe.auth.pass = '********';
    res.json({ success: true, config: safe });
};

exports.updateEmailConfig = (req, res) => {
    const { user, pass } = req.body;
    emailService.updateConfig(user, pass);
    res.json({ success: true });
};

exports.getTraderContacts = (req, res) => {
    res.json(db.traderContacts);
};

exports.updateTraderContacts = (req, res) => {
    const contacts = req.body;
    if (contacts) {
        db.traderContacts = contacts;
        save.traderContacts();
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
};

exports.getStats = (req, res) => {
    const { period, date, startDate, endDate } = req.query;
    const stats = logService.getVisitorStats(period, date, startDate, endDate);
    res.json(stats);
};

exports.getManualEua = (req, res) => {
    const sorted = [...db.euaManualData].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sorted);
};

exports.updateManualEua = (req, res) => {
    const { action, date, price } = req.body;
    if (!action || !date) return res.status(400).json({ success: false });

    if (action === 'add') {
        const p = parseFloat(price);
        if (isNaN(p)) return res.status(400).json({ success: false });
        db.euaManualData = db.euaManualData.filter(d => d.date !== date);
        db.euaManualData.push({ date, price: p });
        save.euaManual();
        res.json({ success: true });
    } else if (action === 'delete') {
        db.euaManualData = db.euaManualData.filter(d => d.date !== date);
        save.euaManual();
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
};

exports.refreshEuaSheet = async (req, res) => {
    try {
        const count = await dataService.syncEUASheetData();
        res.json({ success: true, message: `Synced ${count} records.`, count });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.exportData = (req, res) => {
    const filename = `cofleeter_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.json(db);
};

exports.importData = (req, res) => {
    const data = req.body;
    if (!data || typeof data !== 'object') {
        return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    try {
        if (data.users) db.users = data.users;
        if (data.fleets) db.fleets = data.fleets;
        if (data.fuelData) db.fuelData = data.fuelData;
        if (data.euData) db.euData = data.euData;
        if (data.ciiConstants) db.ciiConstants = data.ciiConstants;
        if (data.euaManualData) db.euaManualData = data.euaManualData;
        if (data.userData) db.userData = data.userData;
        if (data.traderContacts) db.traderContacts = data.traderContacts;
        if (data.orders) db.orders = data.orders;
        if (data.trades) db.trades = data.trades;
        if (data.pools) db.pools = data.pools;
        if (data.emailConfig) db.emailConfig = data.emailConfig;

        save.users();
        save.fleets();
        save.fuelData();
        save.euData();
        save.ciiData();
        save.euaManual();
        save.userData();
        save.traderContacts();
        save.trading();
        save.pools();
        save.emailConfig();

        res.json({ success: true, message: 'Data restored successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: 'Restore failed' });
    }
};
