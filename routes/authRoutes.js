const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/resend', authController.resendOtp);
router.post('/verify', authController.verifyOtp);

router.post('/set-interest', userController.setUserInterest);
router.get('/get-interest/:U_ID', userController.getUserInterest);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploaded/profile_images');
  },
  filename: (req, file, cb) => {
    cb(null, `user_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.post('/update-profile/:id', upload.single('profile_image'), userController.updateProfile);


module.exports = router;