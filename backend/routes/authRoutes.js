const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Wrap all routes with error handler
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(err => {
        console.error('Route error:', err);
        if (res.headersSent) {
            return next(err);
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    });
};

router.post('/login', asyncHandler(authController.login));
router.post('/register', asyncHandler(authController.register));
router.post('/profile', asyncHandler(authController.updateProfile)); // Note: Original was /api/user/profile, we'll map this router to /api/user or split? 
// Original paths:
// POST /api/auth/login
// POST /api/auth/register
// POST /api/user/profile (Auth related but user prefix)
// For cleanliness, I will put profile in user/auth route or keep as is.
// Let's make this router serve /api/auth and we'll create a user router for profile if needed, or just handle it here.

module.exports = router;
