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
const enquireController = require('../controllers/enquireController');

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
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.mkv'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    allowed.includes(ext) ? cb(null, true) : cb(new Error('Unsupported file type'));
  }}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'images', maxCount: 10 }
]);

router.post('/register', authController.register);
router.post('/handle_login', authController.handleLoginOtp);
router.post('/verify', authController.verifyOtp);

router.post('/location',userController.post_user_details);

router.post('/user-interest', userController.updateUserInterest);
router.get('/get-interest/:id', userController.getUserInterest);

router.post('/update-profile', upload.single('profile_image'), userController.updateProfile);

router.post('/follow', userController.followUser);
router.get('/profile-status/:id', userController.getProfileStats);

router.post('/contact', authController.contact);

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
router.post('/poststep3',landTypeController.createPostStep3);
router.post('/poststep4',landTypeController.createPostStep4);
router.post('/poststep5',landTypeController.createPostStep5);

router.post('/poststep6', uploads,  videoController.createPostStep6);
router.post('/publishpost',videoController.publishPost);

router.post('/save_property', userController.saveProperty);
router.post('/unsave_property', userController.unsaveProperty);
router.get('/saved_properties/:U_ID', userController.getSavedProperties);

router.put('/mark_sold', userController.markAsSold);
router.put('/remove_sold', userController.unsoldProperty);

router.get('/land_categories',enquireController.land_categories);
router.post('/save_enquire',enquireController.enquire);
router.get('/getEnquiriesReceived/:user_id',enquireController.getEnquiriesReceived);
router.get('/getMyEnquiries/:user_id',enquireController.getMyEnquiries);
router.post("/decline", enquireController.declineEnquiry);
router.get("/declined", enquireController.getDeclinedEnquiries);

router.put('/delete_post', userController.delete_post);
router.post('/get_reels', userController.getReels);

module.exports = router;