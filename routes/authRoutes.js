const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const notificationController = require('../controllers/notificationController');
const landTypeController = require('../controllers/postController');
const videoController = require('../controllers/videoController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploaded/profile_images');
  },
  filename: (req, file, cb) => {
    cb(null, `user_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const post_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploaded/posts';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '').toLowerCase();
    if (!ext) ext = '.jpg';
    cb(null, `post_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});

const uploads = multer({
  storage: post_storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.mkv'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Unsupported file type'));
  }
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);


router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/resend', authController.resendOtp);
router.post('/verify', authController.verifyOtp);

router.post('/user-interest', userController.updateUserInterest);
router.get('/get-interest/:id', userController.getUserInterest);

router.post('/update-profile', upload.single('profile_image'), userController.updateProfile);

router.post('/follow', userController.followUser);
router.get('/profile-status/:id', userController.getProfileStats);

router.post('/contact', authController.contact);
router.post('/verify_whatsapp_otp', authController.sendWhatsappOtp);

router.get('/getcontact/:id',userController.getContact);

router.get('/followers/:id', userController.getFollowers);
router.get('/following/:id', userController.getFollowing);

router.post('/block-user', userController.blockUser);
router.post('/unblock-user', userController.unblockUser);
router.get('/blocked_list/:id', userController.getBlockedUsers);

router.put('/deactivate', authController.softDeleteUser);
router.put('/reactivate', authController.restoreUser);

router.get('/notifications', notificationController.getNotificationSettings);
router.put('/notifications', notificationController.updateNotificationSettings);

router.get('/land-types', landTypeController.getAllLandTypes);
router.get('/land-categories/:id', landTypeController.getCategoriesByLandType);

router.post('/poststep1',landTypeController.createPostStep1);
router.post('/poststep2',landTypeController.createPostStep2);
router.post('/poststep4',landTypeController.createPostStep4);
router.post('/poststep5',landTypeController.createPostStep5);

router.post('/poststep6', uploads,  videoController.createPostStep6);
module.exports = router;