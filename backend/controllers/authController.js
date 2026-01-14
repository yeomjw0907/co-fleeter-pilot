const { db, save } = require('../models/store');
const { DEFAULT_ROLE_PERMISSIONS } = require('../config/constants');
const logService = require('../services/logService');

exports.login = (req, res) => {
    try {
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
            console.log(`[LOGIN SUCCESS] User: ${user.name} (${user.role})`);
            const { password: pwd, ...safeUser } = user;

            // Log Access
            try {
                logService.logAccess(user, req.ip);
            } catch (logError) {
                console.error('Log access error:', logError);
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
        return res.status(500).json({ 
            success: false, 
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

exports.register = (req, res) => {
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
        ...newUser // newUser includes phone if sent
    };
    console.log(`[REGISTER] Creating new user: ${user.email}`);

    db.users.push(user);
    save.users();

    // Init Fleet
    db.fleets[user.id] = [];
    save.fleets();

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
};

exports.updateProfile = (req, res) => {
    const { userId, currentPassword, newPassword, phone } = req.body;
    const user = db.users.find(u => u.id === userId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.password !== currentPassword) return res.json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    if (phone) user.phone = phone;
    save.users();
    console.log(`User ${user.email} changed their password.`);
    res.json({ success: true, message: 'Password updated successfully' });
};
