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
router.post('/login', authController.login);
router.post('/verify', authController.verifyOtp);
router.post('/location',userController.location);


router.post('/getInterest',userController.getInterest);
router.post('/user_interest', userController.updateUserInterest);
router.post('/get_user_interest', userController.getUserInterest);

router.post('/update_profile', userController.updateProfile);
router.post('/update_username',userController.updateUsername);
router.post('/follow', userController.followUser);
router.post('/profile_status', userController.getProfileStats);
router.post('/contact', authController.contact);

// router.get('/getcontact/:id',userController.getContact);

router.post('/getFollowData', userController.getFollowData);
router.post('/searchfollower',userController.searchfollower);
router.post('/block', userController.blockOrUnblockUser);
router.post('/blocked_list', userController.getBlockedList);

router.post('/deactivate_or_restore_user', authController.deactivate_or_restore_user);

router.post('/get_notification', notificationController.getNotificationSettings);
router.post('/update_notification', notificationController.updateNotificationSettings);

// router.get('/land-types', landTypeController.getAllLandTypes);
router.post('/land_categories', landTypeController.getCategoriesByLandType);

router.post('/poststep1',landTypeController.createPostStep1);
router.post('/poststep2',landTypeController.createPostStep2);
router.post('/poststep3',landTypeController.createPostStep3);
router.post('/poststep4',landTypeController.createPostStep4);
router.post('/poststep5',landTypeController.createPostStep5);
router.post('/poststep6', uploads,  videoController.createPostStep6);
router.post('/poststep7',videoController.createPostStep7);
router.post('/laststep',videoController.laststep);

router.post('/save_property', userController.save_property);
router.post('/saved_properties', userController.getSavedProperties);

router.post('/sold_status', userController.sold_status);
router.post('/getsold_status' , userController.getsold_status);
router.post('/getDraftPosts',userController.getDraftPosts)

router.post('/land_categories_name',enquireController.land_categories);
router.post('/land_categories_para',enquireController.land_categories_para)

router.post('/enquire',enquireController.enquire);
router.post('/my_leads',enquireController.my_leads);
router.post('/self_enquiry',enquireController.self_enquiry);
router.post("/decline", enquireController.declineEnquiry);
router.post("/getdeclined", enquireController.getDeclinedEnquiries);

router.put('/delete_post', userController.delete_post);
router.post('/get_reels', userController.getReels);

router.post('/post_like',userController.post_like);
router.post('/getpost_like_count',userController.getPostLikeCount);
router.post('/add_firstcomment',userController.add_firstcomment);
router.post('/getcomment',userController.getcomment);

router.post('/getreplay_comment',userController.getreplay_comment);
router.post('/likeComment',userController.likeComment);

router.post('/search',userController.search);
router.post('/getInterestedSearchers',userController.getInterestedSearchers);

// router.post('/declineForm',enquireController.declineForm);
// router.post('/declineFormpara',enquireController.declineFormpara);


module.exports = router;