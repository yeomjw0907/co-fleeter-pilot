const { db, save } = require('../models/store');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/constants');
const logService = require('../services/logService');

exports.login = (req, res) => {
    try {
        // Ensure db.users exists (create if not)
        if (!db) {
            console.error('[LOGIN ERROR] Database object not available');
            return res.status(500).json({
                success: false,
                message: 'Server error. Please try again.'
            });
        }

        // Ensure users array exists and has admin
        if (!Array.isArray(db.users)) {
            console.warn('[LOGIN WARNING] db.users is not an array, initializing...');
            db.users = [];
        }
        
        // Always ensure admin exists (fallback)
        const hasAdmin = db.users.some(u => u && u.email === 'cfadmin@cofleeter.com');
        if (!hasAdmin) {
            db.users.push({
                id: 'admin_cf',
                role: 'ADMIN',
                email: 'cfadmin@cofleeter.com',
                password: '1234',
                name: 'Super Admin',
                company: 'Co-Fleeter',
                permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN || {}
            });
            console.log('[LOGIN] Admin user ensured');
        }

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        console.log(`[LOGIN ATTEMPT] Email: ${email}`);

        const user = db.users.find(u => u.email === email && u.password === password);

        if (user) {
            if (user.suspended) {
                console.log(`[LOGIN BLOCKED] Suspended Account: ${email}`);
                return res.status(403).json({ success: false, message: 'This account has been suspended. Please contact administrator.' });
            }

            console.log(`[LOGIN SUCCESS] User: ${user.name} (${user.role})`);
            const { password: pwd, ...safeUser } = user;

            // Log Access
            try {
                logService.logAccess(user, req.ip || 'unknown');
            } catch (logError) {
                console.error('Log access error:', logError);
                // Don't fail login if logging fails
            }

            return res.json({ success: true, user: safeUser });
        } else {
            console.log(`[LOGIN FAILED] Invalid credentials for ${email}`);
            return res.status(401).json({
                success: false,
                message: '아이디(Email) 또는 비밀번호가 일치하지 않습니다.'
            });
        }
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.register = (req, res) => {
    try {
        const newUser = req.body;
        let user = db.users.find(u => u.email === newUser.email);

        if (user) {
            // Update existing
            console.log(`[REGISTER] Updating existing user: ${user.email}`);
            user.password = newUser.password;
            if (newUser.name) user.name = newUser.name;
            if (newUser.company) user.company = newUser.company;
            if (newUser.phone) user.phone = newUser.phone;

            save.users();
            const { password, ...safeUser } = user;
            return res.json({ success: true, user: safeUser, message: 'Account updated successfully.' });
        }

        // Create New
        user = {
            id: 'user_' + Date.now(),
            role: 'USER',
            permissions: DEFAULT_ROLE_PERMISSIONS.USER,
            ...newUser
        };
        console.log(`[REGISTER] Creating new user: ${user.email}`);

        db.users.push(user);
        save.users();

        // Init Fleet
        db.fleets[user.id] = [];
        save.fleets();

        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } catch (error) {
        console.error('[REGISTER ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.updateProfile = (req, res) => {
    try {
        const { userId, currentPassword, newPassword, phone } = req.body;
        const user = db.users.find(u => u.id === userId);

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.password !== currentPassword) return res.json({ success: false, message: 'Current password is incorrect' });

        user.password = newPassword;
        if (phone) user.phone = phone;
        save.users();
        console.log(`User ${user.email} changed their password.`);
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('[UPDATE PROFILE ERROR]', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during profile update',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
