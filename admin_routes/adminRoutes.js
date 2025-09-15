const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const adminController = require('../admin_conrollers/userlist');
const landController = require('../admin_conrollers/land');
const justifyController = require('../admin_conrollers/justify');
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

const evidenceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploaded/evidence");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const uploadEvidence = multer({ storage: evidenceStorage });

router.get('/getusertable', adminController.getusertable);
router.post('/adduser', adminController.adduser);
router.post('/edituser/:user_id', upload.single('profile_image'), adminController.edituser);
router.post('/deleteuser/:user_id', adminController.deleteuser);
router.post('/getuser/:user_id',adminController.getuser);
router.get('/userpost',adminController.getpost);
router.post('/account_band',adminController.account_band);
router.post('/activate_account',adminController.activate_account);
router.post('/delete_account',adminController.delete_account);
router.post('/report_sentence',adminController.report_sentence);

router.get('/landtype',landController.landtype);
router.post('/addland_types',landController.addlandtypes)
router.post('/add_land_category',land_categoies_upload.single('image'),landController.add_land_category)
router.get('/get_land_categorie' ,landController.get_land_categorie);
router.post('/delete_land_categoies', landController.delete_land_categoies);


router.get('/enquire_table',adminController.enquire_table);
router.get('/decline_enquire',adminController.decline_enquire);
router.post('/edit_decline_enquire',adminController.edit_decline_enquire);
router.post('/delete_decline_enquire',adminController.delete_decline_enquire);

router.get('/getbhk_type' , landController.getbhk_type);
router.post('/addbhk_type', landController.addbhk_type);
router.post('/property_facing',landController.property_facing);
router.post('/property_ownership',landController.property_ownership);
router.post('/availability_status',landController.availability_status);
router.post('/other_rooms',landController.other_rooms);
router.post('/furnishing_status',landController.furnishing_status);
router.post('/amenities',landController.amenities);
router.post('/property_highlights',landController.property_highlights);
router.post('/reception_area',landController.reception_area);
router.post('/oxygen_duct',landController.oxygen_duct);
router.post('/lifts',landController.lifts);
router.post('/ups',landController.ups);
router.post('/office_previously_used_for',landController.office_previously_used_for);
router.post('/fire_safety_measures',landController.fire_safety_measures);
router.post('/washroom_details',landController.washroom_details);
router.post('/suitable_business_type',landController.suitable_business_type);

router.post('/account_justify' ,justifyController.account_justify);
router.post( "/submit_justify", uploadEvidence.array("supporting_evidence", 5), justifyController.submit_justify);
module.exports = router;
