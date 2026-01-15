const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/profile', authController.updateProfile); // Note: Original was /api/user/profile, we'll map this router to /api/user or split? 
// Original paths:
// POST /api/auth/login
// POST /api/auth/register
// POST /api/user/profile (Auth related but user prefix)
// For cleanliness, I will put profile in user/auth route or keep as is.
// Let's make this router serve /api/auth and we'll create a user router for profile if needed, or just handle it here.

module.exports = router;
