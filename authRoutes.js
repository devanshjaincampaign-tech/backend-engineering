// auth/authRoutes.js
//
// Defines all authentication routes.
// Routes are registered on the Express router,
// then the router is imported into the main app.

const express    = require('express');
const router     = express.Router();
const controller = require('./authController');
const verifyToken = require('./authMiddleware');

// Public routes — no token needed
// Anyone can hit these
router.post('/register', controller.register);
router.post('/login',    controller.login);
router.post('/refresh',  controller.refreshToken);
router.post('/logout',   controller.logout);

// Protected route — token required
// verifyToken runs first, then getMe
// If verifyToken fails, getMe never runs
router.get('/me', verifyToken, controller.getMe);

module.exports = router;