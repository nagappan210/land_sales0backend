const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const adminController = require('../admin_conrollers/userlist');
const landController = require('../admin_conrollers/land');
const { ro } = require('@faker-js/faker');

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

const land_categories = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploaded/land_categoies'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, uniqueName);
  }
});

const land_categoies_upload = multer({ storage: land_categories });


router.get('/getusertable', adminController.getusertable);
router.post('/adduser', adminController.adduser);
router.post('/edituser/:user_id', upload.single('profile_image'), adminController.edituser);
router.post('/deleteuser/:user_id', adminController.deleteuser);
router.post('/getuser/:user_id',adminController.getuser);
router.get('/userpost',adminController.getpost);

router.get('/landtype',landController.landtype);
router.post('/addland_types',landController.addlandtypes)
router.post('/add_land_category',land_categoies_upload.single('image'),landController.add_land_category)
router.get('/get_land_categorie' ,landController.get_land_categorie);
router.post('/delete_land_categoies', landController.delete_land_categoies);


router.get('/enquire_table',adminController.enquire_table);
router.get('/decline_enquire',adminController.decline_enquire);
router.post('/edit_decline_enquire',adminController.edit_decline_enquire);
router.post('/delete_decline_enquire',adminController.delete_decline_enquire);
module.exports = router;
