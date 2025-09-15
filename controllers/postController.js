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
    return res.status(200).json({
      result: "0",
      error: "status are required and it must be Integer.",
      data: []
    });
  }

  const [existing_categoies] = await db.query (`select * from land_categories where land_type_id = ?`,[status]);
  if(existing_categoies.length === 0){
    return res.status(200).json({
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
  try {
    
    let { user_id, user_type, user_post_id } = req.body;
    console.log(user_id , user_post_id , user_type);
    
    user_id = Number(user_id);
    user_type = Number(user_type);
    user_post_id = Number(user_post_id);
    const draft = 1

    if (!user_id || isNaN(user_id) || ![0, 1].includes(user_type) ) {
      return res.status(200).json({
        result: "0",
        error: "user_id and user_post_id is required and user_type must be 0 or 1.",
        data: []
      });
    }

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ? and deleted_at is null`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User does not exist in database",
        data: []
      });
    }
    
    let exist_post = [];
    if (user_post_id) {
      [exist_post] = await db.query(
        `SELECT * FROM user_posts WHERE user_post_id = ? AND U_ID = ?`,
        [user_post_id, user_id]
      );
    }
    
    

    if (exist_post.length > 0) {
      const [row] = await db.query(
        `UPDATE user_posts SET user_type = ?, updated_at = NOW() WHERE user_post_id = ? AND U_ID = ? and deleted_at is null and account_status = 0`,
        [user_type, user_post_id, user_id]
      );

      if(row.affectedRows === 0){
        return res.json({
        result: "0",
        error: "post not fount in database",
        data: []
      });
      }

      return res.json({
        result: "1",
        message: "Step 1 completed: Existing post updated.",
        data: { post_id: user_post_id }
      });
    }

      const [result] = await db.query(
      `INSERT INTO user_posts (U_ID, user_type, status , draft) VALUES (?, ?, 'draft' , ?)`,
      [user_id, user_type , draft]);
      return res.status(201).json({
      result: "1",
      message: "Step 1 completed: New post created.",
      data: { post_id: result.insertId }
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

  if (!user_id || !user_post_id || !status || !land_categorie_id) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required.",
      data: []
    });
  }

  const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
  if (exist_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User does not exist in database",
      data: []
    });
  }

  const draft = 2;

  try {
    const [existingPost] = await db.query(
      `SELECT land_type_id, land_categorie_id 
       FROM user_posts 
       WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL and account_status = 0`,
      [user_id, user_post_id]
    );

    if (existingPost.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "Post not found",
        data: []
      });
    }

    const current = existingPost[0];

    if (
      (!current.land_type_id && !current.land_categorie_id) ||
      (current.land_type_id == status && current.land_categorie_id == land_categorie_id)
    ) {
      await db.query(
        `UPDATE user_posts 
         SET land_type_id = ?, land_categorie_id = ?, updated_at = NOW(), draft = ?
         WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL`,
        [status, land_categorie_id, draft, user_id, user_post_id]
      );

      return res.json({
        result: "1",
        message: "Step 2 completed: Land type and category updated.",
        data: []
      });
    } else {
      await db.query(
        `UPDATE user_posts SET land_type_id = ?,  land_categorie_id = ?,  property_name = NULL, property_area = NULL, bhk_type = NULL, carpet_area = NULL, built_up_area = NULL, super_built_up_area = NULL, facade_width = NULL, facade_height = NULL, area_length = NULL, area_width = NULL, property_facing = Null, carpet_area_unit = Null,built_up_area_unit = Null,super_built_up_area_unit = Null,area_length_unit = Null,area_width_unit = null,pantry_size_unit = Null,property_area_unit = Null, total_floor = NULL, property_floor_no = NULL, property_ownership = NULL, availability_status = NULL, no_of_bedrooms = NULL, no_of_bathrooms = NULL, no_of_balconies = NULL, no_of_open_sides = NULL, no_of_cabins = NULL, no_of_meeting_rooms = NULL, min_of_seats = NULL, max_of_seats = NULL, conference_room = NULL, no_of_staircases = NULL, washroom_details = NULL, reception_area = NULL, pantry = NULL, pantry_size = NULL, central_ac = NULL, oxygen_duct = NULL, ups = NULL, other_rooms = NULL, furnishing_status = NULL, fire_safety_measures = NULL, lifts = NULL, local_authority = NULL, noc_certified = NULL, occupancy_certificate = NULL, office_previously_used_for = NULL, Parking_available = NULL, boundary_wall = NULL, amenities = NULL, suitable_business_type = NULL, price = NULL, property_highlights = NULL, video = NULL, image_ids = NULL, thumbnail = NULL, updated_at = NOW(), draft = ?
         WHERE U_ID = ? AND user_post_id = ? AND deleted_at IS NULL`,
        [status, land_categorie_id, draft, user_id, user_post_id]
      );

      return res.json({
        result: "1",
        message: "Step 2 completed: Land type/category changed, dependent fields reset.",
        data: []
      });
    }
  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.getform_details_residential = async (req, res) => {
  const { land_categorie_id } = req.body;

  try {
    let data = [];

    switch (land_categorie_id) {
      case 1: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          select_floor_plane: floor_plane_rows.map(r => r.bhk_type),
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
          no_of_bedrooms: ["1", "2", "3", "4"],
          no_of_bathrooms: ["1", "2", "3", "4"],
          no_of_balconies: ["1", "2", "3", "4"],
          no_of_open_sides : [""],
          is_boundary_wall_around_property : [""],
          other_rooms: other_rooms_rows.map(r => r.other_rooms),
          furnishing_status: furnishing_status_rows.map(r => r.furnishing_status),
          parking_available: ["Yes", "No"],
          amenities: amenities_rows.map(r => r.amenities),
          property_highlights: property_highlights_rows.map(r => r.property_highlights)
        }]
          
        });
        break;
      }
      case 2: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push( {
          property_name: "1",
          select_floor_plane: floor_plane_rows.map(r => r.bhk_type),
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_bedrooms: ["1", "2", "3", "4"],
            no_of_bathrooms: ["1", "2", "3", "4"],
            no_of_balconies: ["1", "2", "3", "4"],
            no_of_open_sides : [""],
            is_boundary_wall_around_property : [""],
            other_rooms: other_rooms_rows.map(r => r.other_rooms),
            furnishing_status: furnishing_status_rows.map(r => r.furnishing_status),
            parking_available: ["Yes", "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 3: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push(
          {
          property_name: "1",
          select_floor_plane: floor_plane_rows.map(r => r.bhk_type),
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status), 
          optional : [{
            no_of_bedrooms: ["1", "2", "3", "4"],
            no_of_bathrooms: ["1", "2", "3", "4"],
            no_of_balconies: ["1", "2", "3", "4"],
            no_of_open_sides : [""],
            is_boundary_wall_around_property : [""],
            other_rooms: other_rooms_rows.map(r => r.other_rooms),
            furnishing_status: furnishing_status_rows.map(r => r.furnishing_status),
            parking_available: ["Yes", "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        }
        ) 
        ;
        break;
      }
      case 4: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push(
          {
          property_name: "1",
          select_floor_plane: [""],
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status), 
          optional : [{
            no_of_bedrooms : [""],
            no_of_bathrooms: ["1", "2", "3", "4"],
            no_of_balconies: ["1", "2", "3", "4"],
            no_of_open_sides : [""],
            is_boundary_wall_around_property : [""],
            other_rooms: [""],
            furnishing_status: [""],
            parking_available: ["Yes", "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        }
        )
        ;
        break;
      }
      case 5: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push(
          {
          property_name: "1",
          select_floor_plane: [""],
          property_area: "1",
          Carpet_area: "",
          built_up_area: "",
          super_built_up_area: "",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "",
            your_property_floor_no: ""
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership),
          availability_status : [""],
          optional : [{
            no_of_bedrooms : [""],
            no_of_bathrooms : [""],
            no_of_balconies : [""],
            no_of_open_sides: ["1", "2", "3", "4"],
            is_boundary_wall_around_property: ["Yes", "No"],
            other_rooms : [""],
            furnishing_status : [""],
            parking_available : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        }
        )
        ;
        break;
      }
      case 6: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push(
          {
          property_name: "1",
          select_floor_plane: [""],
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" 
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_bedrooms : [""],
            no_of_bathrooms : [""],
            no_of_balconies : [""],
            no_of_open_sides: [""],
            is_boundary_wall_around_property : [""],
            other_rooms : [""],
            furnishing_status : [""],
            parking_available : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        }
        )
        ;
        break;
      }
      default:
        return res.status(200).json({
          result: "0",
          error: "Invalid land_categorie_id",
          data: []
        });
    }

    return res.status(200).json({
      result: "1",
      error: "",
      data
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

exports.getform_details_commercial = async (req, res) => {
  const { land_categorie_id } = req.body;

  try {
    let data = [];

    switch (land_categorie_id) {
      case 7: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [pantry] = await db.query(`select pantry from pantry`);
        const [central_ac] = await db.query(`select central_ac from central_ac`);
        const [oxygen_duct] = await db.query(`select oxygen_duct from oxygen_duct`);
        const [ups] = await db.query(`select ups from ups`);
        const [furnishing_status] = await db.query(`select furnishing_status from furnishing_status`);
        const [fire_safety_measures] = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const [lifts] = await db.query(`select lifts from lifts`);
        const [office_previously_used_for] = await db.query(`select office_previously_used_for from office_previously_used_for`);
        
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length : "",
            width : ""
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing : [""],
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_cabins: ["1", "2", "3", "4+"],
            no_of_meeting_rooms: ["1", "2", "3", "4+"],
            min_no_of_seats: ["1", "2", "3", "4+"],
            max_no_of_seats: ["1", "2", "3", "4+"],
            conference_room : ["0" , "1" , "2" , "3+"],
            no_of_staircases: ["1", "2", "3", "4+"],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area: reception_area.map(r => r.reception_area),
            pantry: pantry.map(r => r.pantry),
            pantry_size : "1",
            washroom_details : [""],
            suitable_business_type : [""],

            central_ac: central_ac.map(r => r.central_ac),
            oxygen_duct: oxygen_duct.map(r => r.oxygen_duct),
            ups: ups.map(r => r.ups),
            furnishing_status: furnishing_status.map(r => r.furnishing_status),
            fire_safety_measures: fire_safety_measures.map(r => r.fire_safety_measures),
            lifts: lifts.map(r => r.lifts),
            parking_available: ["Yes", "No"],
            is_it_pre_leased_pre_rented : ["Yes", "No"],
            is_your_office_fire_noc_certified : ["Yes", "No"],
            occupancy_certificate : ["Yes", "No"],
            office__previously_used_for : office_previously_used_for.map(r=> r.office_previously_used_for),
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 8: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [pantry] = await db.query(`select pantry from pantry`);
        const [central_ac] = await db.query(`select central_ac from central_ac`);
        const [oxygen_duct] = await db.query(`select oxygen_duct from oxygen_duct`);
        const [ups] = await db.query(`select ups from ups`);
        const [furnishing_status] = await db.query(`select furnishing_status from furnishing_status`);
        const [fire_safety_measures] = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const [lifts] = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        const [washroom_details] = await db.query(`select washroom_details from washroom_details`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length : "",
            width : ""
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing : [""],
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_cabins: ["1", "2", "3", "4+"],
            no_of_meeting_rooms: ["1", "2", "3", "4+"],
            min_no_of_seats : [""],
            max_no_of_seats: ["1", "2", "3", "4+"],
            conference_room : ["0" , "1" , "2" , "3+"],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area: reception_area.map(r => r.reception_area),
            pantry: pantry.map(r => r.pantry),
            pantry_size : "1",
            washroom_details : washroom_details.map(r =>r.washroom_details),
            suitable_business_type : [""],
            central_ac: central_ac.map(r => r.central_ac),
            oxygen_duct: oxygen_duct.map(r => r.oxygen_duct),
            ups: ups.map(r => r.ups),
            furnishing_status: furnishing_status.map(r => r.furnishing_status),
            fire_safety_measures: fire_safety_measures.map(r => r.fire_safety_measures),
            lifts: lifts.map(r => r.lifts),
            parking_available: ["Yes", "No"],
            is_it_pre_leased_pre_rented : [""],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 9: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const pantry = await db.query(`select pantry from pantry`);
        const central_ac = await db.query(`select central_ac from central_ac`);
        const oxygen_duct = await db.query(`select oxygen_duct from oxygen_duct`);
        const ups = await db.query(`select ups from ups`);
        const furnishing_status = await db.query(`select furnishing_status from furnishing_status`);
        const [fire_safety_measures] = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const [washroom_details] = await db.query(`select washroom_details from washroom_details`);
        const lifts = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length : "",
            width : ""
          }],
          shop_facade: [ {
            facade_width: "1",
            facade_height: "1" }
          ],
          property_facing: property_facing_rows.map(r => r.property_facing), 
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status), 
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: washroom_details.map(r => r.washroom_details),
            suitable_business_type : [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: fire_safety_measures.map(r => r.fire_safety_measures),
            lifts : [""],
            parking_available: ["Yes", "No"],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 10: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const pantry = await db.query(`select pantry from pantry`);
        const central_ac = await db.query(`select central_ac from central_ac`);
        const oxygen_duct = await db.query(`select oxygen_duct from oxygen_duct`);
        const ups = await db.query(`select ups from ups`);
        const furnishing_status = await db.query(`select furnishing_status from furnishing_status`);
        const [fire_safety_measures] = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const [washroom_details] = await db.query(`select washroom_details from washroom_details`);
        const lifts = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        const [suitable_business_type] = await db.query(`select suitable_business_type from suitable_business_type`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length : "",
            width : ""
          }],
          shop_facade: [ {
            facade_width: "1",
            facade_height: "1" }
          ],
          property_facing: property_facing_rows.map(r => r.property_facing), 
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status), 
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
           
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: washroom_details.map(r => r.washroom_details),
            suitable_business_type: suitable_business_type.map(r => r.suitable_business_type),
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: fire_safety_measures.map(r => r.fire_safety_measures),
            lifts : [""],
            parking_available: ["Yes", "No"],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }] 
          
        });
        break;
      }
      case 11: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const pantry = await db.query(`select pantry from pantry`);
        const central_ac = await db.query(`select central_ac from central_ac`);
        const oxygen_duct = await db.query(`select oxygen_duct from oxygen_duct`);
        const ups = await db.query(`select ups from ups`);
        const furnishing_status = await db.query(`select furnishing_status from furnishing_status`);
        const fire_safety_measures = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const washroom_details = await db.query(`select washroom_details from washroom_details`);
        const lifts = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area: "1",
          carpet_area : "",
          built_up_area : "",
          super_built_up_area : "",
          area_dimensions: [ {
            length: "1",
            width: "1" }
          ],
          shop_facade : [{
            facade_width: "",
            facade_height: ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details : [{
            total_floors_in_property: "",
            your_property_floor_no: "" 
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership),
          availability_status : [""],
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            which_authority_the_property_is_approved_by : ["Yes" , "No"],
            no_of_open_sides: ["1", "2" , "3" , "4"],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: [""],
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }] 
          
        });
        break;
      }
      case 12: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const pantry = await db.query(`select pantry from pantry`);
        const central_ac = await db.query(`select central_ac from central_ac`);
        const oxygen_duct = await db.query(`select oxygen_duct from oxygen_duct`);
        const ups = await db.query(`select ups from ups`);
        const furnishing_status = await db.query(`select furnishing_status from furnishing_status`);
        const fire_safety_measures = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const [washroom_details] = await db.query(`select washroom_details from washroom_details`);
        const lifts = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length : "",
            width : ""
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details : [{
            total_floors_in_property: "",
            your_property_floor_no: ""
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status), 
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: washroom_details.map(r => r.washroom_details),
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 13: {
        const [reception_area] = await db.query(`select reception_area from reception_area`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const pantry = await db.query(`select pantry from pantry`);
        const central_ac = await db.query(`select central_ac from central_ac`);
        const oxygen_duct = await db.query(`select oxygen_duct from oxygen_duct`);
        const ups = await db.query(`select ups from ups`);
        const furnishing_status = await db.query(`select furnishing_status from furnishing_status`);
        const fire_safety_measures = await db.query(`select fire_safety_measures from fire_safety_measures`);
        const washroom_details = await db.query(`select washroom_details from washroom_details`);
        const lifts = await db.query(`select lifts from lifts`);
        const office_previously_used_for = await db.query(`select office_previously_used_for from office_previously_used_for`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          carpet_area : "1",
          built_up_area : "",
          super_built_up_area : "1",
          area_dimensions: [ {
            length: "1",
            width: "1" }
          ],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details : [{
            total_floors_in_property: "",
            your_property_floor_no: ""
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership),
          availability_status : [""],
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            which_authority_the_property_is_approved_by : ["Yes" , "No"],
            no_of_open_sides: ["1", "2" , "3" , "4"],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: [""],
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 14: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "",
            width: "",
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "" 
          }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: [""],
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_it_pre_leased_pre_rented : [""],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 15: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          Carpet_area: "1",
          built_up_area: "",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "",
            width: "",
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: [""],
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_it_pre_leased_pre_rented : [""],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
        });
        break;
      }
      case 16: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "1",
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          shop_facade : [{
            facade_width : "",
            facade_height : ""
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "",
            your_property_floor_no: "" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership),
          availability_status : [""],
          optional : [{
            no_of_cabins: [""],
            no_of_meeting_rooms: [""],
            min_no_of_seats : [""],
            max_no_of_seats: [""],
            conference_room : [""],
            no_of_staircases : [""],
            no_of_open_sides : [""],
            which_authority_the_property_is_approved_by : [""],
            reception_area : [""],
            pantry : [""],
            pantry_size : "",
            washroom_details: [""],
            suitable_business_type: [""],
            central_ac : [""],
            oxygen_duct : [""],
            ups : [""],
            furnishing_status : [""],
            fire_safety_measures: [""],
            lifts : [""],
            parking_available: [],
            is_it_pre_leased_pre_rented : ["Yes" , "No"],
            is_your_office_fire_noc_certified : [""],
            occupancy_certificate : [""],
            office_previously_used_for : [""],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      default:
        return res.status(200).json({
          result: "0",
          error: "Invalid land_categorie_id",
          data: []
        });
    }

    return res.status(200).json({
      result: "1",
      error: "",
      data
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

exports.getform_details_agriculture = async (req, res) => {
  const { land_categorie_id } = req.body;

  try {
    let data = [];

    switch (land_categorie_id) {
      case 17: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area : "",
          select_floor_plane: floor_plane_rows.map(r => r.bhk_type),
          Carpet_area: "1",
          built_up_area: "1",
          super_built_up_area: "1",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details: [ {
            total_floors_in_property: "1",
            your_property_floor_no: "1" }
          ],
          property_ownership: property_ownership_rows.map(r => r.property_ownership), 
          availability_status: availability_status_rows.map(r => r.availability_status),
          optional : [{
            no_of_bedrooms: ["1", "2", "3", "4"],
            no_of_bathrooms: ["1", "2", "3", "4"],
            no_of_balconies: ["1", "2", "3", "4"],
            no_of_open_sides : [""],
            does_your_property_authority_approved : [""],
            is_boundary_wall_around_property : [""],
            other_rooms: other_rooms_rows.map(r => r.other_rooms),
            furnishing_status: furnishing_status_rows.map(r => r.furnishing_status),
            parking_available: ["Yes", "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      case 18: {
        const [floor_plane_rows] = await db.query(`SELECT bhk_type FROM bhk_type`);
        const [property_facing_rows] = await db.query(`SELECT property_facing FROM property_facing`);
        const [property_ownership_rows] = await db.query(`SELECT property_ownership FROM property_ownership`);
        const [availability_status_rows] = await db.query(`SELECT availability_status FROM availability_status`);
        const [other_rooms_rows] = await db.query(`SELECT other_rooms FROM other_rooms`);
        const [furnishing_status_rows] = await db.query(`SELECT furnishing_status FROM furnishing_status`);
        const [amenities_rows] = await db.query(`SELECT amenities FROM amenities`);
        const [property_highlights_rows] = await db.query(`SELECT property_highlights FROM property_highlights`);

        data.push({
          property_name: "1",
          property_area: "1",
          select_floor_plane : [""],
          carpet_area : "",
          built_up_area : "",
          super_built_up_area : "",
          area_dimensions : [{
            length: "1",
            width: "1",
          }],
          property_facing: property_facing_rows.map(r => r.property_facing),
          floor_details : [{
            total_floors_in_property : "",
            your_property_floor_no : ""
          }],
          property_ownership: property_ownership_rows.map(r => r.property_ownership),
          availability_status : [""],
          optional : [{
            no_of_bedrooms : [""],
            no_of_bathrooms : [""],
            no_of_balconies : [""],
            other_rooms : [""],
            furnishing_status : [""],
            parking_available : [""],
            does_your_property_authority_approved : ["Yes" , "No"],
            no_of_open_sides: ["1", "2", "3", "4"],
            is_boundary_wall_around_property: ["Yes" , "No"],
            amenities: amenities_rows.map(r => r.amenities),
            property_highlights: property_highlights_rows.map(r => r.property_highlights)
          }]
          
        });
        break;
      }
      default:
        return res.status(200).json({
          result: "0",
          error: "Invalid land_categorie_id",
          data: []
        });
    }

    return res.status(200).json({
      result: "1",
      error: "",
      data
    });

  } catch (err) {
    console.log(err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

exports.createPostStep3 = async (req, res) => {
  const { user_id, user_post_id, country, state, city, locality, latitude, longitude } = req.body;

  if ( !user_id || !country || !state || !city || !locality || !user_post_id || !latitude || !longitude) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required",
      data: []
    });
  }
  const draft = 3

  try {

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ? and deleted_at is null`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User does not exist in database",
        data: []
      });
    }

    const [updateResult] = await db.query(
      `UPDATE user_posts 
       SET country = ?, state = ?, city = ?, locality = ?, latitude = ?, longitude = ?, updated_at = NOW() , draft = ?
       WHERE U_ID = ? AND user_post_id = ? and deleted_at is null and account_status =0`,
      [country, state, city, locality, latitude, longitude, draft,  user_id, user_post_id]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(200).json({
        result: "0",
        error: "Post not found for this user",
        data: []
      });
    }

    res.json({
      result: "1",
      message : "Step 3 completed: Location saved.",
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

exports.createPostStep4 = async (req, res) => {
  const {
    user_id,
    user_post_id,
    property_name, property_area, property_area_unit,
    carpet_area, carpet_area_unit, built_up_area, built_up_area_unit,
    super_built_up_area, super_built_up_area_unit,
    area_length, area_length_unit, area_width, area_width_unit,
    property_facing, total_floor, property_floor_no,
    property_ownership, availability_status, furnishing_status, boundary_wall,
    parking_available, amenities, property_highlights,
    facade_width, facade_width_unit, facade_height, facade_height_unit,

    bhk_type, no_of_bedrooms, no_of_bathrooms, no_of_balconies, no_of_open_sides, other_rooms,

    no_of_cabins, no_of_meeting_rooms, min_of_seats, max_of_seats,
    conference_room, no_of_staircases, reception_area, pantry, pantry_size, pantry_size_unit,
    central_ac, oxygen_duct, ups, fire_safety_measures, lifts,
    noc_certified, occupancy_certificate, office_previously_used_for,
    washroom_details, local_authority, suitable_business_type,
  } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(200).json({
      result: "0",
      error: "user_id and user_post_id are required.",
      data: []
    });
  }

  const draft = 4;

  try {
    const [landTypeResult] = await db.query(
      `SELECT land_type_id FROM user_posts WHERE U_ID = ? AND user_post_id = ? LIMIT 1`,
      [user_id, user_post_id]
    );

    if (!landTypeResult.length) {
      return res.status(200).json({
        result: "0",
        error: "Post not found for given user_id and user_post_id.",
        data: []
      });
    }

    const land_type_id_from_db = landTypeResult[0].land_type_id;
    let updateQuery = "";
    let updateValues = [];
    let landTypeName = "";

    switch (land_type_id_from_db) {
      // ------------------ Residential ------------------
      case 1:
        landTypeName = "Residential";
        updateQuery = `
          UPDATE user_posts SET 
            property_name = ?, bhk_type = ?, property_area = ?, property_area_unit = ?, 
            carpet_area = ?, carpet_area_unit = ?, built_up_area = ?, built_up_area_unit = ?, 
            super_built_up_area = ?, super_built_up_area_unit = ?, 
            area_length = ?, area_length_unit = ?, area_width = ?, area_width_unit = ?, 
            property_facing = ?, total_floor = ?, property_floor_no = ?, 
            property_ownership = ?, availability_status = ?, 
            no_of_bedrooms = ?, no_of_bathrooms = ?, no_of_balconies = ?, no_of_open_sides = ?, 
            boundary_wall = ?, other_rooms = ?, furnishing_status = ?, 
            parking_available = ?, amenities = ?, property_highlights = ?, 
            updated_at = NOW(), draft = ?
          WHERE U_ID = ? AND user_post_id = ? 
            AND deleted_at IS NULL AND account_status = 0
        `;
        updateValues = [
          property_name || null, bhk_type || null, property_area || null, property_area_unit || null,
          carpet_area || null, carpet_area_unit || null, built_up_area || null, built_up_area_unit || null,
          super_built_up_area || null, super_built_up_area_unit || null,
          area_length || null, area_length_unit || null, area_width || null, area_width_unit || null,
          property_facing || null, total_floor || null, property_floor_no || null,
          property_ownership || null, availability_status || null,
          no_of_bedrooms || null, no_of_bathrooms || null, no_of_balconies || null, no_of_open_sides || null,
          boundary_wall || null, other_rooms || null, furnishing_status || null,
          parking_available || null, amenities || null, property_highlights || null,
          draft, user_id, user_post_id
        ];
        break;

      // ------------------ Commercial ------------------
      case 2:
        landTypeName = "Commercial";
        updateQuery = `
          UPDATE user_posts SET 
            property_name = ?, bhk_type = ?, property_area = ?, property_area_unit = ?, 
            carpet_area = ?, carpet_area_unit = ?, built_up_area = ?, built_up_area_unit = ?, 
            super_built_up_area = ?, super_built_up_area_unit = ?, 
            area_length = ?, area_length_unit = ?, area_width = ?, area_width_unit = ?, 
            property_facing = ?, total_floor = ?, property_floor_no = ?, 
            property_ownership = ?, availability_status = ?, 
            facade_width = ?, facade_width_unit = ?, facade_height = ?, facade_height_unit = ?, 
            no_of_cabins = ?, no_of_meeting_rooms = ?, min_of_seats = ?, max_of_seats = ?, 
            conference_room = ?, no_of_staircases = ?, reception_area = ?, 
            pantry = ?, pantry_size = ?, pantry_size_unit = ?, 
            central_ac = ?, oxygen_duct = ?, ups = ?, boundary_wall = ?, other_rooms = ?, furnishing_status = ?, 
            fire_safety_measures = ?, lifts = ?, noc_certified = ?, occupancy_certificate = ?, 
            office_previously_used_for = ?, parking_available = ?, washroom_details = ?, 
            local_authority = ?, suitable_business_type = ?, amenities = ?, property_highlights = ?, 
            updated_at = NOW(), draft = ?
          WHERE U_ID = ? AND user_post_id = ? 
            AND deleted_at IS NULL AND account_status = 0
        `;
        updateValues = [
          property_name || null, bhk_type || null, property_area || null, property_area_unit || null,
          carpet_area || null, carpet_area_unit || null, built_up_area || null, built_up_area_unit || null,
          super_built_up_area || null, super_built_up_area_unit || null,
          area_length || null, area_length_unit || null, area_width || null, area_width_unit || null,
          property_facing || null, total_floor || null, property_floor_no || null,
          property_ownership || null, availability_status || null,
          facade_width || null, facade_width_unit || null, facade_height || null, facade_height_unit || null,
          no_of_cabins || null, no_of_meeting_rooms || null, min_of_seats || null, max_of_seats || null,
          conference_room || null, no_of_staircases || null, reception_area || null,
          pantry || null, pantry_size || null, pantry_size_unit || null,
          central_ac || null, oxygen_duct || null, ups || null, boundary_wall || null, other_rooms || null,
          furnishing_status || null, fire_safety_measures || null, lifts || null,
          noc_certified || null, occupancy_certificate || null, office_previously_used_for || null,
          parking_available || null, washroom_details || null, local_authority || null, suitable_business_type || null,
          amenities || null, property_highlights || null,
          draft, user_id, user_post_id
        ];
        break;

      // ------------------ Industrial ------------------
      case 3:
        landTypeName = "Industrial";
        updateQuery = `
          UPDATE user_posts SET 
            property_name = ?, bhk_type = ?, property_area = ?, property_area_unit = ?, 
            carpet_area = ?, carpet_area_unit = ?, built_up_area = ?, built_up_area_unit = ?, 
            super_built_up_area = ?, super_built_up_area_unit = ?, 
            area_length = ?, area_length_unit = ?, area_width = ?, area_width_unit = ?, 
            property_facing = ?, total_floor = ?, property_floor_no = ?, 
            property_ownership = ?, availability_status = ?, 
            facade_width = ?, facade_width_unit = ?, facade_height = ?, facade_height_unit = ?, 
            no_of_cabins = ?, no_of_meeting_rooms = ?, min_of_seats = ?, max_of_seats = ?, 
            conference_room = ?, no_of_staircases = ?, reception_area = ?, 
            pantry = ?, pantry_size = ?, pantry_size_unit = ?, 
            central_ac = ?, oxygen_duct = ?, ups = ?, boundary_wall = ?, other_rooms = ?, furnishing_status = ?, 
            fire_safety_measures = ?, lifts = ?, noc_certified = ?, occupancy_certificate = ?, 
            office_previously_used_for = ?, parking_available = ?, washroom_details = ?, 
            local_authority = ?, suitable_business_type = ?, amenities = ?, property_highlights = ?, 
            updated_at = NOW(), draft = ?
          WHERE U_ID = ? AND user_post_id = ? 
            AND deleted_at IS NULL AND account_status = 0
        `;
        updateValues = [
          property_name || null, bhk_type || null, property_area || null, property_area_unit || null,
          carpet_area || null, carpet_area_unit || null, built_up_area || null, built_up_area_unit || null,
          super_built_up_area || null, super_built_up_area_unit || null,
          area_length || null, area_length_unit || null, area_width || null, area_width_unit || null,
          property_facing || null, total_floor || null, property_floor_no || null,
          property_ownership || null, availability_status || null,
          facade_width || null, facade_width_unit || null, facade_height || null, facade_height_unit || null,
          no_of_cabins || null, no_of_meeting_rooms || null, min_of_seats || null, max_of_seats || null,
          conference_room || null, no_of_staircases || null, reception_area || null,
          pantry || null, pantry_size || null, pantry_size_unit || null,
          central_ac || null, oxygen_duct || null, ups || null, boundary_wall || null, other_rooms || null,
          furnishing_status || null, fire_safety_measures || null, lifts || null,
          noc_certified || null, occupancy_certificate || null, office_previously_used_for || null,
          parking_available || null, washroom_details || null, local_authority || null, suitable_business_type || null,
          amenities || null, property_highlights || null,
          draft, user_id, user_post_id
        ];
        break;

      default:
        return res.status(200).json({
          result: "0",
          error: "Invalid land_type_id.",
          data: []
        });
    }

    const [updateResult] = await db.query(updateQuery, updateValues);

    if (updateResult.affectedRows === 0) {
      return res.status(200).json({
        result: "0",
        error: "Post not found or already deleted.",
        data: []
      });
    }

    res.json({
      result: "1",
      error: "",
      message: `Step 4 completed for ${landTypeName} property.`
    });

  } catch (err) {
    console.error("createPostStep4 error:", err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};


exports.createPostStep5 = async (req, res) => {
  const { user_id,user_post_id, price , price_negotiable } = req.body;

  const draft = 5;
  try {
    const [result] = await db.query(
      `UPDATE user_posts SET price = ?,price_negotiable = ? , updated_at = NOW() , draft = ? WHERE U_ID = ? and user_post_id = ? and deleted_at is null and account_status = 0`,
      [price || 0, price_negotiable || 0 ,  draft , user_id , user_post_id]
    );

    if (result.affectedRows === 0) {
      return res.status(200).json({ result : "0",
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
