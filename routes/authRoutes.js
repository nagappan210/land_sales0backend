const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploaded/profile_images');
  },
  filename: (req, file, cb) => {
    cb(null, `user_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/resend', authController.resendOtp);
router.post('/verify', authController.verifyOtp);

router.post('/set-interest/:id', userController.setUserInterest);
router.get('/get-interest/:id', userController.getUserInterest);

router.post('/update-profile/:id', upload.single('profile_image'), userController.updateProfile);

router.post('/follow/:id', userController.followUser);
router.get('/profile-status/:id', userController.getProfileStats);

router.post('/contact/:id', authController.contact);
router.post('/verify_whatsapp_otp/:id', authController.sendWhatsappOtp);

router.get('/getcontact/:id',userController.getcontact);

router.get('/user/:id/followers', userController.getFollowers);
router.get('/user/:id/following', userController.getFollowing);

router.post('/block-user/:id', userController.blockUser);
router.post('/unblock-user/:id', userController.unblockUser);
router.get('/blocked_list/:id', userController.getBlockedUsers);

router.put('/deactivate/:id', authController.softDeleteUser);
router.put('/reactivate/:id', authController.restoreUser);


module.exports = router;