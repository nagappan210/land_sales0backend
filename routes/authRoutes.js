const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/resend', authController.resendOtp);
router.post('/verify', authController.verifyOtp);

router.post('/set-interest', userController.setUserInterest);
router.get('/get-interest/:U_ID', userController.getUserInterest);

module.exports = router;