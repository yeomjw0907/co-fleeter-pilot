const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Wrap all routes with error handler for serverless
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
router.post('/profile', asyncHandler(authController.updateProfile));

module.exports = router;
