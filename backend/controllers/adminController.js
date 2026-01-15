const { db, save, getStatus } = require('../models/store');
const dataService = require('../services/dataService');
const emailService = require('../services/emailService');
const logService = require('../services/logService');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/constants');

// DB Status for Admin panel
exports.getDbStatus = (req, res) => {
    const state = getStatus ? getStatus() : 0;
    let status = 'disconnected';

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

exports.deleteUser = (req, res) => {
    const { targetUserId, currentUserId } = req.body;
    if (targetUserId === currentUserId) {
        return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    const INITIAL_COUNT = db.users.length;
    db.users = db.users.filter(u => u.id !== targetUserId);

    if (db.users.length < INITIAL_COUNT) {
        save.users();
        res.json({ success: true, message: 'User deleted' });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
    }
};

exports.toggleUserStatus = (req, res) => {
    const { targetUserId } = req.body;
    const user = db.users.find(u => u.id === targetUserId);
    if (user) {
        user.suspended = !user.suspended; // Toggle status
        save.users();
        res.json({ success: true, message: user.suspended ? 'User suspended' : 'User activated', suspended: user.suspended });
    } else {
        res.status(404).json({ success: false, message: 'User not found' });
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
        // [Sync Deletion] Compare Old vs New to delete removed traders (ETS & FuelEU)
        const categories = ['ETS', 'FuelEU'];
        let deletedCount = 0;
        let createdCount = 0;

        categories.forEach(cat => {
            const oldList = Array.isArray(db.traderContacts[cat]) ? db.traderContacts[cat] : (db.traderContacts[cat] ? Object.values(db.traderContacts[cat]) : []);
            const newList = Array.isArray(contacts[cat]) ? contacts[cat] : (contacts[cat] ? Object.values(contacts[cat]) : []);

            // Track valid Login IDs in the new list
            const newLoginIds = new Set(newList.map(t => t.loginId || t.email).filter(e => e));

            oldList.forEach(oldT => {
                const oldAuthId = oldT.loginId || oldT.email;
                if (oldAuthId && !newLoginIds.has(oldAuthId)) {
                    // This trader was removed. Delete the User account.
                    const idx = db.users.findIndex(u => u.email === oldAuthId && u.role === 'TRADER');
                    if (idx !== -1) {
                        db.users.splice(idx, 1);
                        deletedCount++;
                        console.log(`[Auto-Delete] Deleted TRADER account for ${oldAuthId} (${cat})`);
                    }
                }
            });

            // [Auto-Create] Create accounts for new contacts
            newList.forEach(t => {
                const authId = t.loginId || t.email;
                if (authId && authId.trim() !== '') {
                    const exists = db.users.find(u => u.email === authId);
                    if (!exists) {
                        const newUser = {
                            id: 'trader_' + Date.now() + Math.random().toString(36).substr(2, 5),
                            role: 'TRADER',
                            email: authId, // Login ID
                            password: '1234', // Default Password
                            name: t.name || `${cat} Trader`,
                            company: t.company || 'Co-Fleeter Traders',
                            phone: t.phone || '',
                            permissions: DEFAULT_ROLE_PERMISSIONS['TRADER'] || []
                        };
                        db.users.push(newUser);
                        createdCount++;
                        console.log(`[Auto-Create] Created new TRADER account for ${authId} (${cat})`);
                    }
                }
            });
        });

        // Update DB with new contacts (Structure might have changed to Arrays if we normalized)
        db.traderContacts = contacts;
        save.traderContacts();

        if (createdCount > 0 || deletedCount > 0) {
            save.users();
        }

        const msg = [];
        if (createdCount > 0) msg.push(`${createdCount} created`);
        if (deletedCount > 0) msg.push(`${deletedCount} deleted`);
        const resultMsg = msg.length > 0 ? `Contacts saved. Accounts: ${msg.join(', ')}.` : 'Contacts saved.';

        res.json({ success: true, message: resultMsg });
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
