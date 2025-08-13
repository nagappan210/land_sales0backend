const db = require('../db');


// exports.getAllLandTypes = async (req, res) => {
//   try {
//     const [results] = await db.query('SELECT * FROM land_types');
//     res.json({ result: 1, data: results, message: 'Data fetched' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getCategoriesByLandType = async (req, res) => {
const {status} = req.body;

  if(!status || isNaN(status)){
    return res.status(400).json({
      result: "0",
      error: "status are required and it must be Integer.",
      data: []
    });
  }

  const [existing_categoies] = await db.query (`select * from land_categories where land_type_id = ?`,[status]);
  if(existing_categoies.length === 0){
    return res.status(400).json({
      result : "0",
      error : "The status is not existing in databse",
      data  : []
    })
  }
  try {
    const [results] = await db.query(
      'SELECT land_categorie_id , name FROM land_categories WHERE land_type_id = ?',
      [status]
    );
    res.json({ result: 1, data: results, message: 'Data fetched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPostStep1 = async (req, res) => {
  const { user_id, user_type } = req.body;

  if (!user_id || !user_type) {
    return res.status(400).json({
      result: "0",
      error: "user_id and user_type are required.",
      data: []
    });
  }
  const [exist_user] = await db.query (`select * from users where U_ID = ?`,[user_id]);
      if(exist_user.length === 0 ){
        return res.status(400).json({
          result : "0",
          error : "User does not existing in database",
          data : []
        })
      }

  if (!['owner', 'broker'].includes(user_type.toLowerCase())) {
    return res.status(400).json({
      result: "0",
      error: 'Invalid user_type. Must be "owner" or "broker".',
      data: []
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO user_posts (U_ID, user_type, status) VALUES (?, ?, 'draft')`,
      [user_id, user_type]
    );

    return res.status(201).json({
      result: "1",
      error: "",
      message: "Step 1 completed: User type saved.",
      data: {
        post_id: result.insertId
      }
    });

  } catch (err) {
    console.error("Create Post Step 1 Error:", err);
    return res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.createPostStep2 = async (req, res) => {
  const { user_id, user_post_id, status, land_categorie_id } = req.body;
  if (!user_id || ! user_post_id || !status || !land_categorie_id) {
    return res.status(400).json({ 
      result : "0",
      error : "All fileds are required.",
      data : []
     });
  }
  const [exist_user] = await db.query (`select * from users where U_ID = ?`,[user_id]);
      if(exist_user.length === 0 ){
        return res.status(400).json({
          result : "0",
          error : "User does not existing in database",
          data : []
        })
      }

  try {
    const [result] = await db.query(`
      UPDATE user_posts 
      SET land_type_id = ?, land_categorie_id = ?, updated_at = NOW() 
      WHERE U_ID = ? AND user_post_id = ? AND deleted_at is null
    `, [status, land_categorie_id, user_id , user_post_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        result : "0",
        error : "Post not found or already deleted.",
        data : []
       });
    }

    res.json({ 
      result : "1",
      error : "Step 2 completed: Land type and category updated.",
      data : []
    });
} 
  catch (err) {
    res.status(500).json({ 
      result : "0",
      error: err.message,
      data : []
     });
  }
};

exports.createPostStep3 = async (req, res) => {
  const { user_id, user_post_id, country, state, city, locality, latitude, longitude } = req.body;

  if ( !user_id || !country || !state || !city || !locality || !user_post_id || !latitude || !longitude) {
    return res.status(400).json({
      result: "0",
      error: "All fields are required",
      data: []
    });
  }

  try {

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "User does not exist in database",
        data: []
      });
    }

    if(isNaN(latitude || longitude)){
      return res.status(400).json({
        result : "0",
        error : "Latitude and Longitude are in double only.",
        data :[]
      })
    }

    const [updateResult] = await db.query(
      `UPDATE user_posts 
       SET country = ?, state = ?, city = ?, locality = ?, latitude = ?, longitude = ?, updated_at = NOW() 
       WHERE U_ID = ? AND user_post_id = ?`,
      [country, state, city, locality, latitude, longitude, user_id, user_post_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({
        result: "0",
        error: "Post not found for this user",
        data: []
      });
    }

    res.json({
      result: "1",
      error: "Step 3 completed: Location saved.",
      data: []
    });

  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};


// exports.createPostStep4 = async (req, res) => {
//   const {
//     user_id, user_post_id, land_type_id, property_name, bhk_type, bathrooms, balconies,  Carpet_area, built_up_length, super_built_up_area, 
//     furnishing, 
//     total_floors, property_floor, is_boundary_wall,
//     parking_available, ownership_type, availability_status,

//     description, amenities, pre_rented, open_sides, construction_done,
//     water_source, flooring_type, authority_approved, facing_direction,

//     office_setup, shop_facade_size, washroom_details, available_features, fire_safety_measures,
//     landmark_nearby, staircase_count, lift_available, fire_noc_certified, occupancy_certificate,
//     previously_used_for, location_advantages, suitable_for_business, other_features,
//     road_width, property_dimension, industry_type_approved, pantry_cafeteria,
//     shop_location, kind_of_office, floors_allowed
//   } = req.body;

//   if (!user_id || !user_post_id) {
//     return res.status(400).json({ message: "user_id and user_post_id are required." });
//   }

//   try {

//     const [landTypeResult] = await db.query(
//       `SELECT land_type_id FROM user_posts WHERE U_ID = ? AND user_post_id = ? LIMIT 1`,
//       [user_id, user_post_id]
//     );

//     if (!landTypeResult.length) {
//       return res.status(404).json({ message: 'Post not found for given user_id and user_post_id.' });
//     }

//     const land_type_id_from_db = landTypeResult[0].land_type_id;
//     let updateQuery = '';
//     let updateValues = [];
//     let landTypeName = '';

//     switch (land_type_id_from_db) {
//       case 1:
//         landTypeName = "Residential";
//         updateQuery = `
//           UPDATE user_posts SET 
//             property_name = ?, bhk_type = ?, property_area = ?, area_length = ?, area_width = ?,
//             total_floors = ?, property_floor = ?, furnishing = ?, 
//             parking_available = ?, ownership_type = ?, availability_status = ?, 
//             description = ?, amenities = ?, open_sides = ?, construction_done = ?, is_boundary_wall = ?,
//             water_source = ?, flooring_type = ?, updated_at = NOW()
//           WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL
//         `;
//         updateValues = [
//           property_name || null, bhk_type || null, property_area || null, area_length || null, area_width || null,
//           total_floors || null, property_floor || null, furnishing || null,
//           parking_available || null, ownership_type || null, availability_status || null,
//           description || null, amenities || null, open_sides || null, construction_done || null, is_boundary_wall || null,
//           water_source || null, flooring_type || null,
//           user_id, user_post_id
//         ];
//         break;

//       case 2: 
//         landTypeName = "Commercial";
//         updateQuery = `
//           UPDATE user_posts SET 
//             property_name = ?, property_area = ?, area_length = ?, area_width = ?, 
//             total_floors = ?, property_floor = ?, furnishing = ?, parking_available = ?, 
//             ownership_type = ?, availability_status = ?, description = ?, amenities = ?, 
//             pre_rented = ?, open_sides = ?, construction_done = ?, authority_approved = ?, 
//             facing_direction = ?, office_setup = ?, shop_facade_size = ?, washroom_details = ?, 
//             available_features = ?, fire_safety_measures = ?, landmark_nearby = ?, staircase_count = ?, 
//             lift_available = ?, fire_noc_certified = ?, occupancy_certificate = ?, previously_used_for = ?, 
//             location_advantages = ?, suitable_for_business = ?, other_features = ?, road_width = ?, 
//             property_dimension = ?, industry_type_approved = ?, flooring_type = ?, pantry_cafeteria = ?, 
//             shop_location = ?, kind_of_office = ?, updated_at = NOW()
//           WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL
//         `;
//         updateValues = [
//           property_name || null, property_area || null, area_length || null, area_width || null, 
//           total_floors || null, property_floor || null, furnishing || null, parking_available || null, 
//           ownership_type || null, availability_status || null, description || null, amenities || null, 
//           pre_rented || null, open_sides || null, construction_done || null, authority_approved || null, 
//           facing_direction || null, office_setup || null, shop_facade_size || null, washroom_details || null, 
//           available_features || null, fire_safety_measures || null, landmark_nearby || null, staircase_count || null, 
//           lift_available || null, fire_noc_certified || null, occupancy_certificate || null, previously_used_for || null, 
//           location_advantages || null, suitable_for_business || null, other_features || null, road_width || null, 
//           property_dimension || null, industry_type_approved || null, flooring_type || null, pantry_cafeteria || null, 
//           shop_location || null, kind_of_office || null,
//           user_id, user_post_id
//         ];
//         break;

//       case 3:
//         landTypeName = "Industrial";
//         updateQuery = `
//           UPDATE user_posts SET 
//             property_name = ?, property_area = ?, bhk_type = ?, area_length = ?, area_width = ?, 
//             is_boundary_wall = ?, furnishing = ?, parking_available = ?, 
//             ownership_type = ?, availability_status = ?, description = ?, 
//             amenities = ?, open_sides = ?, construction_done = ?, 
//             authority_approved = ?, facing_direction = ?, flooring_type = ?, 
//             road_width = ?, property_dimension = ?, industry_type_approved = ?, 
//             updated_at = NOW()
//           WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL
//         `;
//         updateValues = [
//           property_name || null, property_area || null, bhk_type || null, area_length || null, area_width || null,
//           is_boundary_wall || null, furnishing || null, parking_available || null,
//           ownership_type || null, availability_status || null, description || null,
//           amenities || null, open_sides || null, construction_done || null,
//           authority_approved || null, facing_direction || null, flooring_type || null,
//           road_width || null, property_dimension || null, industry_type_approved || null,
//           user_id, user_post_id
//         ];
//         break;

//       default:
//         return res.status(400).json({ message: 'Invalid land_type_id.' });
//     }

//     const [updateResult] = await db.query(updateQuery, updateValues);

//     if (updateResult.affectedRows === 0) {
//       return res.status(404).json({ message: 'Update failed: Post not found or already deleted.' });
//     }

//     res.json({ success: true, message: `Step 4 completed for ${landTypeName} property.` });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

exports.createPostStep5 = async (req, res) => {
  const { user_id,user_post_id, price } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE user_posts SET price = ?, updated_at = NOW() WHERE U_ID = ? and user_post_id =?`,
      [price || 0, user_id , user_post_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ result : "0",
        error: 'Post not found.',
      data : [] });
    }

    res.json({
      result : "1", 
      message: 'Step 5 completed: Price saved.',
    data : []});
  } catch (err) {
    res.status(500).json({ result : "0",
       error: err.message,
      data : [] });
  }
};
