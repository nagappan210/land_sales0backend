const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const adminController = require('../admin_conrollers/userlist');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploaded/profile_images/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });


router.get('/getusertable', adminController.getusertable);
router.post('/adduser', adminController.adduser);
router.post('/edituser/:user_id', upload.single('profile_image'), adminController.edituser);
router.post('/deleteuser/:user_id', adminController.deleteuser);
router.post('/getuser/:user_id',adminController.getuser);

module.exports = router;
