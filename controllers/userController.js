const db = require('../db');

// exports.add_land_category = async (req, res) => {
//   try {
//     const { land_categorie_id } = req.body;
//     const image = req.file ? req.file.filename : null;

//     if (!land_categorie_id) {
//       return res.status(400).json({ message: 'land_categorie_id is required.' });
//     }

//     if (!image) {
//       return res.status(400).json({ message: 'Image file is required.' });
//     }

//     await db.query(
//       `UPDATE land_categories SET image = ? WHERE land_categorie_id = ?`,
//       [image, land_categorie_id]
//     );

//     res.json({ message: 'Image updated successfully.', filename: image });
//   } catch (err) {
//     console.error('Error updating image:', err);
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.getContact = async (req, res) => {
//   const userId = req.params.id;

//   try {
//     const [result] = await db.query(
//       `SELECT phone_num, whatsapp_num, email FROM users WHERE U_ID = ?`,
//       [userId]
//     );

//     if (result.length === 0) return res.status(404).json({ message: 'User not found' });

//     res.json(result[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.post_user_details = async (req, res) => {
  try {
    const { user_id, country, state, cities, pincode , latitude , longitude } = req.body;

    if (!user_id || !country || !state || !cities || !pincode || !latitude || !longitude ) {
      return res.status(400).json({
        result: "0",
        error: "All Filed are required",
        data: []
      });
    }

    if(isNaN(latitude || longitude)){
      return res.status(400).json({
        result : "0",
        error : "Latitude and Longitude are in double",
        data :[]
      })
    }

    const [existing_user] = await db.query(`select * from users where U_ID = ?` , [user_id]);
    if(existing_user.length ===0){
      return res.status(400).json({
        result : "0",
        error : "User does not exist in table",
        data :[]
      })
    }

    await db.query(
      `UPDATE users SET country = ?, state = ?, cities = ?, pincode = ? , latitude = ? , longitude = ? WHERE U_ID = ?`,
      [country || "", state || "", cities || "", pincode || "", latitude || "" , longitude || "" , user_id]
    );

    res.json({
      result: "1",
      error : "",
      message: "Location saved successfully",
    });

  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.getInterest = async (req, res) => {
  try {
    let { page = 1 } = req.body;

    page = parseInt(page);
    limit = parseInt(10);
    const offset = (page - 1) * limit;

    const [results] = await db.query(`
      SELECT land_categorie_id, land_type_id, name, image 
      FROM land_categories 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await db.query(`SELECT COUNT(*) AS total FROM land_categories`);
    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nextPage = page < totalPages ? page + 1 : 0;
    if (totalCount === 0 || page > totalPages) {
      return res.json({
        result: "0",
        error: "No records found",
        data: [],
        totalPages,
        nxtpage: 0,
        recCnt: totalCount
      });
    }

    res.json({
      result: "1",
      error: "",
      data: results,
      totalPages,
      nxtpage: nextPage,
      recCnt: totalCount
    });

  } catch (err) {
    console.error('Error fetching land interests:', err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: [],
      totalPages: 0,
      nxtpage: 0,
      recCnt: 0
    });
  }
};

exports.updateUserInterest = async (req, res) => {
  try {
    let { user_interest, user_id } = req.body;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required and must be a valid number.",
        message: "Failed to update interest."
      });
    }

    if (typeof user_interest === "string") {
      user_interest = user_interest.split(",");
    }

    if (!Array.isArray(user_interest) || user_interest.length === 0) {
      user_interest = Array.from({ length: 18 }, (_, i) => i + 1);
    }

    let validInterests = user_interest
      .map(val => Number(val))
      .filter(num => Number.isInteger(num) && num >= 1 && num <= 18);

    if (validInterests.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "Invalid interest values provided.",
        message: "Failed to update interest."
      });
    }

    validInterests = [...new Set(validInterests)].sort((a, b) => a - b);

    const settingsUser = validInterests.join(",");

    const [result] = await db.query(
      `UPDATE users SET user_interest = ? WHERE U_ID = ?`,
      [settingsUser, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found.",
        message: "No update occurred."
      });
    }

    return res.json({
      result: "1",
      message: "User interest updated successfully.",
      data: settingsUser
    });

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      message: "Server error occurred."
    });
  }
};

exports.getUserInterest = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required",
        data: []
      });
    }

    const [result] = await db.query(
      `SELECT user_interest FROM users WHERE U_ID = ?`,
      [user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    return res.json({
      result: "1",
      data: [
        {
          user_id,
          user_interest: result[0].user_interest
        }
      ],
    });

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, user_id } = req.body;
    const profile_image = req.file ? req.file.filename : null;

    if (!Number.isInteger(Number(user_id))) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required and must be an integer",
        data: []
      });
    }

    const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (existing_user.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found in the table",
        data: []
      });
    }

    const updateFields = [];
    const values = [];

    if (username) {
      const [existing] = await db.query(
        "SELECT * FROM users WHERE username = ? AND U_ID != ?",
        [username, user_id]
      );
      if (existing.length > 0) {
        return res.status(409).json({
          result: "0",
          error: "Username already taken",
          data: []
        });
      }
      updateFields.push("username = ?");
      values.push(username);
    }

    if (bio) {
      updateFields.push("bio = ?");
      values.push(bio);
    }

    if (profile_image) {
      updateFields.push("profile_image = ?");
      values.push(profile_image);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "No data provided for update",
        data: []
      });
    }

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE U_ID = ?`;
    values.push(user_id);
    await db.query(query, values);

    res.json({
      result: "1",
      message: "Profile updated successfully",
    });

  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.getProfileStats = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }

  const query = `
    SELECT 
      u.U_ID AS user_id,u.username,u.bio,u.profile_image,
      (SELECT COUNT(*) FROM user_posts 
        WHERE U_ID = u.U_ID 
          AND deleted_at IS NULL 
          AND status = 'published' 
          AND is_sold = 0) AS posts,
      (SELECT COUNT(*) 
        FROM followers 
        WHERE following_id = u.U_ID) AS followers,
      (SELECT COUNT(*) 
        FROM followers 
        WHERE user_id = u.U_ID) AS following
    FROM users u
    WHERE u.U_ID = ? AND u.deleted_at IS NULL
  `;

  try {
    const [results] = await db.query(query, [user_id]);

    if (results.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const profile = results[0];

    const normalizeProfile = (profile) => ({
      user_id: profile.user_id,
      username: profile.username || "",
      bio: profile.bio || "",
      profile_image: profile.profile_image || "",
      posts: profile.posts || 0,
      followers: profile.followers || 0,
      following: profile.following || 0
    });

    return res.json({
      result: "1",
      error: "",
      data: [normalizeProfile(profile)]
    });

  } catch (err) {
    console.error("Profile Stats Error:", err);
    return res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.followUser = async (req, res) => {
  try {
    let { user_id, following_id, status } = req.body;
    status = Number(status);

    if (!user_id || !following_id || !status || isNaN(user_id) || isNaN(following_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id, following_id , status are required and it must be a Integer",
        data: []
      });
    }

    const [existing_user] = await db.query(`select * from users where U_ID =?`,[user_id]);
    if(existing_user.length === 0){
      return res.status(400).json({
        result : "0",
        error : "User is not existing in database",
        data :[]
      });
    }
    
    const [existing_follower] = await db.query(`select * from users where U_ID =?`,[following_id]);
    if(existing_follower.length === 0 ){
      return res.status(400).json({
        result : "0",
        error : "Follower Id is not existing in database",
        data :[]
      })
    }


    if (user_id === following_id) {
      return res.status(400).json({
        result: "0",
        error: "You can't follow yourself.",
        data: []
      });
    }

    if (status === 1) {
      const [check] = await db.query(
        `SELECT * FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, following_id]
      );

      if (check.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "Already following.",
          data: []
        });
      }

      await db.query(
        `INSERT INTO followers (user_id, following_id, followed_at) VALUES (?, ?, NOW())`,
        [user_id, following_id]
      );

      return res.json({
        result: "1",
        message: "Followed successfully",
        status: 1,
      });
    }

    if (status === 2) {
      const [check] = await db.query(
        `SELECT * FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, following_id]
      );

      if (check.length === 0) {
        return res.status(404).json({
          result: "0",
          error: "Not following.",
          data: []
        });
      }

      await db.query(
        `DELETE FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, following_id]
      );

      return res.json({
        result: "1",
        message: "Unfollowed successfully",
        status: 2,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status. Use 1 (follow) or 2 (unfollow).",
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

exports.getFollowData = async (req, res) => {
  const { user_id, status, page = 1 } = req.body;
  const limit = 50;

  if (!user_id || !status) {
    return res.status(400).json({
      result: "0",
      error: "user_id and status are required.",
      data: []
    });
  }

  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  const offset = (page - 1) * limit;

  try {
    let baseQuery = '';
    let countQuery = '';
    let values = [user_id, limit, offset];
    let countValues = [user_id];

    if (status === 1) {
      baseQuery = `
        SELECT u.U_ID, u.username, u.profile_image
        FROM followers f
        JOIN users u ON f.user_id = u.U_ID
        WHERE f.following_id = ?
        LIMIT ? OFFSET ?`;

      countQuery = `
        SELECT COUNT(*) as total
        FROM followers f
        WHERE f.following_id = ?`;

    } else if (status === 2) {
    
      baseQuery = `
        SELECT u.U_ID, u.username, u.profile_image
        FROM followers f
        JOIN users u ON f.following_id = u.U_ID
        WHERE f.user_id = ?
        LIMIT ? OFFSET ?`;

      countQuery = `
        SELECT COUNT(*) as total
        FROM followers f
        WHERE f.user_id = ?`;

    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status. Use 1 for followers or 2 for following.",
        data: []
      });
    }

    const [rawData] = await db.query(baseQuery, values);
    const [countResult] = await db.query(countQuery, countValues);

    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nxtpage = page < totalPages ? page + 1 : 0;

    const normalizeUser = (user) => ({
      user_id: user.U_ID,
      username: user.username ?? "",
      profile_image: user.profile_image ?? ""
    });

    const data = rawData.map(normalizeUser);

    res.json({
      result: "1",
      error: "",
      data,
      recCnt: totalCount,
      totalPages,
      nxtpage
    });

  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.save_property = async (req, res) => {
  const { user_id, user_post_id, status } = req.body;

  if (!user_id || !user_post_id || typeof status === 'undefined') {
    return res.status(400).json({
      result : "0",
      error: 'U_ID, user_post_id, and status are required.',
      data : []
    });
  }

  if(isNaN(user_id) || isNaN(user_post_id)){
    return res.status(400).json({
      result : "0",
      error: 'U_ID, user_post_id are must be in Integer',
      data : []
    });
  }

  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  const [existing_post] = await db.query(`select * from user_posts where user_post_id = ?`,[user_post_id]);
  if(existing_post.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User post is not fount in database",
      data : []
    });
  }


  try {
    if (status == 1) {
      await db.query(
        'INSERT IGNORE INTO saved_properties (U_ID, user_post_id) VALUES (?, ?)',
        [user_id, user_post_id]
      );
      return res.json({ result : "1", 
        message: 'Property saved successfully.',
        data : []
      });

    } else if (status == 2) {
      const [result] = await db.query(
        'DELETE FROM saved_properties WHERE U_ID = ? AND user_post_id = ?',
        [user_id, user_post_id]
      );
      return res.json({ result: "1", 
        message: 'Property unsaved successfully.',
        data : []
      });

    } else {
      return res.status(400).json({
        success: "0",
        error: 'Invalid status. Use 1 for save, 2 for unsave.',
        data :[]
      });
    }
  } catch (err) {
    return res.status(500).json({
      result : "0",
      error: err.message,
      data : []
    });
  }
};

exports.getSavedProperties = async (req, res) => {
  const { user_id, page = 1 } = req.body;
  const  limit = 10
  const notnull = (property) => ({
    property_name: property.property_name ?? "",
    city: property.city ?? "",
    locality: property.locality ?? "",
    property_area: property.property_area ?? "",
    price: property.price ?? "",
    description: property.description ?? "",
    amenities: property.amenities ?? "",
    facing_direction: property.facing_direction ?? "",
    video: property.video ?? "",
    image_ids: property.image_ids ?? "",
    created_at: property.created_at ?? ""
  });

  if (!user_id) {
    return res.json({
      result: "0",
      error: "user_id is required and it must be in Integer",
      data: []
    });
  }
  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  try {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM saved_properties sp
      JOIN user_posts p ON sp.user_post_id = p.user_post_id
      WHERE sp.U_ID = ?
    `, [user_id]);

    const [rows] = await db.query(`
      SELECT 
        p.property_name,
        p.city,
        p.locality,
        p.property_area,
        p.price,
        p.description,
        p.amenities,
        p.facing_direction,
        p.video,
        p.image_ids,
        p.created_at
      FROM saved_properties sp
      JOIN user_posts p ON sp.user_post_id = p.user_post_id
      WHERE sp.U_ID = ?
      LIMIT ? OFFSET ?
    `, [user_id, parseInt(limit), parseInt(offset)]);

    const normalizedData = rows.map(notnull);

    return res.json({
      result: "1",
      data: normalizedData,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.sold_status = async (req, res) => {
  const { user_id, user_post_id, status } = req.body;
  if (!user_id || !user_post_id || !status) {
    return res.status(400).json({
      result: "0",
      error: "user_id, user_post_id, and status are required.",
      data: [],
    });
  }
  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  try {
    let query = "";
    let message = "";

    if (status == 2) {
      query = `UPDATE user_posts 
               SET is_sold = 0, sold_at = NULL 
               WHERE user_post_id = ? AND U_ID = ?`;
      message = "Property marked as unsold.";
    } else if (status == 1) {
      query = `UPDATE user_posts 
               SET is_sold = 1, sold_at = NOW() 
               WHERE user_post_id = ? AND U_ID = ?`;
      message = "Property marked as sold.";
    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status. Use 1 for unsold, 2 for sold.",
        data: [],
      });
    }

    const [result] = await db.query(query, [user_post_id, user_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "Property not found or status already set.",
        data: [],
      });
    }

    return res.json({
      result: "1",
      message: message,
    });
  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: [],
    });
  }
};

exports.getsold_status = async (req, res) => {
  const { user_id, page = 1 } = req.body; 
  const limit = 10
  if (!user_id || isNaN(user_id)) {
    return res.json({
      result: "0",
      error: "user_id is required and it must be in Integer",
      data: []
    });
  }


  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  const offset = (page - 1) * limit;
  try {

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM user_posts WHERE U_ID = ? AND is_sold = 1`,
      [user_id]
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const [rows] = await db.query(`
      SELECT 
        property_name,
        city,
        locality,
        property_area,
        price,
        description,
        amenities,
        facing_direction,
        video,
        created_at
      FROM user_posts
      WHERE U_ID = ? AND is_sold = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [user_id, parseInt(limit), parseInt(offset)]);

    const normalizedData = rows.map((property) => ({
      property_name: property.property_name ?? "",
      city: property.city ?? "",
      locality: property.locality ?? "",
      property_area: property.property_area ?? "",
      price: property.price ?? "",
      description: property.description ?? "",
      amenities: property.amenities ?? "",
      facing_direction: property.facing_direction ?? "",
      video: property.video ?? "",
      created_at: property.created_at ?? ""
    }));

    return res.json({
      result: "1",
      data: normalizedData,
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages
      
    });
  } catch (err) {
    console.error("Error fetching sold status:", err);
    return res.status(500).json({
      result: "0",
      error: "Database query failed",
      details: err.message
    });
  }
};

exports.getDraftPosts = async (req, res) => {
  const { user_id, page = 1 } = req.body;
  const limit = 10
  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required and it must be in Integer",
      data: []
    });
  }
  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(400).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total
       FROM user_posts
       WHERE U_ID = ? 
         AND status = 'draft'
         AND deleted_at IS NULL`,
      [user_id]
    );

    const [rows] = await db.query(
      `SELECT 
        property_name,
        city,
        locality,
        property_area,
        price,
        description,
        amenities,
        facing_direction,
        video,
        created_at
      FROM user_posts
      WHERE U_ID = ?
        AND status = 'draft' 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [user_id, Number(limit), Number(offset)]
    );

    

    const normalizedData = rows.map(post => ({
      property_name: post.property_name ?? "",
      city: post.city ?? "",
      locality: post.locality ?? "",
      property_area: post.property_area ?? "",
      price: post.price ?? "",
      description: post.description ?? "",
      amenities: post.amenities ?? "",
      facing_direction: post.facing_direction ?? "",
      video: post.video ?? "",
      created_at: post.created_at ?? ""
    }));

    if(rows.length === 0){
      return res.status(400).json({
      result : "0",
      error : "No value in database",
      data : []
    });
    }

    res.json({
      result: "1",
      data: normalizedData,
      total, 
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error("Get Draft Posts Error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.blockOrUnblockUser = async (req, res) => {
  const { user_id, blocker_id, status } = req.body;

  if (!user_id || !blocker_id || !status) {
    return res.status(400).json({
      result: "0",
      error: "Fill all fields",
      data: []
    });
  }
  const [exist_user] = await db.query(`select * from users where U_ID =?`,[user_id]);
  if(exist_user.length === 0){
      return res.status(400).json({
          result : "0",
          error : "User does not exist in database",
          data : []
        });
      }
  const [exist_blocker] = await db.query(`select * from users where U_ID =?`,[blocker_id  ]);
      if(exist_blocker.length === 0){
        return res.status(400).json({
          result : "0",
          error : "Blocker ID does not exist in database",
          data : []
        });
      }

  if (user_id === blocker_id) {
    return res.status(400).json({
      result: "0",
      error: "You can't block yourself.",
      data: []
    });
  }

  try {
    const [existing] = await db.query(
      `SELECT * FROM blocks WHERE user_id = ? AND blocker_id = ?`,
      [user_id, blocker_id]
    );

    if (status === 1) {
      if (existing.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "User is already blocked.",
          data: []
        });
      }

      await db.query(
        `INSERT INTO blocks (user_id, blocker_id) VALUES (?, ?)`,
        [user_id, blocker_id]
      );

      return res.json({
        result: "1",
        message: "User blocked successfully.",
        error: "",
        data: []
      });

    } else if (status === 2) {
      // UNBLOCK USER
      if (existing.length === 0) {
        return res.status(404).json({
          result: "0",
          error: "User is not blocked.",
          data: []
        });
      }

      await db.query(
        `DELETE FROM blocks WHERE user_id = ? AND blocker_id = ?`,
        [user_id, blocker_id]
      );

      return res.json({
        result: "1",
        message: "User unblocked successfully.",
        error: "",
        data: []
      });

    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status. Use 1 (block) or 2 (unblock).",
        data: []
      });
    }

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.getBlockedList = async (req, res) => {
  const { user_id, page = 1 } = req.body;
  const limit = 10;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }
  const [exist_user] = await db.query(`select * from users where U_ID =?`,[user_id]);
      if(exist_user.length === 0){
        return res.status(400).json({
          result : "0",
          error : "User does not exist in database",
          data : []
        });
      }
  const currentPage = parseInt(page);
  const offset = (currentPage - 1) * limit;

  try {
    const [rawResults] = await db.query(
      `SELECT u.U_ID, u.username, u.profile_image
       FROM blocks b
       JOIN users u ON b.blocker_id = u.U_ID
       WHERE b.user_id = ?
       LIMIT ? OFFSET ?`,
      [user_id, limit, offset]
    );

    const [totalCountResult] = await db.query(
      `SELECT COUNT(*) as total FROM blocks WHERE user_id = ?`,
      [user_id]
    );

    const totalCount = totalCountResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nxtpage = currentPage < totalPages ? currentPage + 1 : 0;

    const normalizeUser = (user) => ({
      user_id: user.U_ID,
      username: user.username ?? "",
      profile_image: user.profile_image ?? ""
    });

    const data = rawResults.map(normalizeUser);

    if(data.length === 0){
      return res.status(400).json({
        result : "0",
        error : "There is no data for this User",
        data :[]
      })
    }

    res.json({
      result: "1",
      message: "Blocked user list fetched successfully",
      error: "",
      data,
      recCnt: totalCount,
      totalPages,
      nxtpage
    });

  } catch (err) {
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.delete_post = async (req, res) => {
  const { user_id, user_post_id } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(400).json({
      success: false,
      message: "user_id and user_post_id are required.",
    });
  }

  try {
    const [check] = await db.query(
      `SELECT * FROM user_posts WHERE user_post_id = ? AND U_ID = ? `,
      [user_post_id, user_id]
    );

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Post not found or already deleted.",
      });
    }

    await db.query(
      `UPDATE user_posts
       SET deleted_at = NOW()
       WHERE user_post_id = ? AND U_ID = ?`,
      [user_post_id, user_id]
    );

    res.json({
      success: true,
      message: "Post soft deleted successfully.",
    });
  } catch (err) {
    console.error("Soft Delete Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getReels = async (req, res) => {
  const { user_id, page = 1 } = req.body;
  const limit = 10;

  if (!user_id) {
    return res.status(400).json({ result: "0", error: "user_id is required", data: [] });
  }
  
  const offset = (parseInt(page) - 1) * limit;

  try {
    const [user] = await db.query(
      "SELECT user_interest FROM users WHERE U_ID = ? AND deleted_at IS NULL",
      [user_id]
    );

    if (!user.length) {
      return res.status(404).json({ result: "0", error: "User not found", data: [] });
    }

    const interestIds = user[0].user_interest ? user[0].user_interest.split(",") : [];

    if (interestIds.length === 0) {
      return res.status(200).json({ result: "1", data: [], total: 0 });
    }

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM user_posts
       WHERE FIND_IN_SET(land_categorie_id, ?)
         AND status = 'published'
         AND video IS NOT NULL
         AND deleted_at IS NULL`,
      [interestIds.join(",")]
    );

    const total = countRows[0].total;

    const [reels] = await db.query(
      `SELECT 
         up.user_post_id,
         up.video,
         up.property_name,
         up.land_categorie_id,
         u.name AS owner_name,
         COALESCE(pl.total_likes, 0) AS total_likes
       FROM user_posts up
       JOIN users u ON u.U_ID = up.U_ID
       LEFT JOIN (
         SELECT user_post_id, COUNT(*) AS total_likes
         FROM post_likes
         GROUP BY user_post_id
       ) pl ON pl.user_post_id = up.user_post_id
       WHERE FIND_IN_SET(up.land_categorie_id, ?)
         AND up.status = 'published'
         AND up.video IS NOT NULL
         AND up.deleted_at IS NULL
       ORDER BY up.created_at DESC
       LIMIT ? OFFSET ?`,
      [interestIds.join(","), limit, offset]
    );

    if(reels.length === 0){
      return res.status(400).json({ 
        result: "0",
         error: "No data for User_id", 
         data: [] });
    }
    return res.status(200).json({
      result: "1",
      data: reels,
      page: parseInt(page),
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ result: "0", error: "Server error", data: [] });
  }
};

exports.post_like = async (req, res) => {
  const { user_id, user_post_id, status } = req.body;

  if (!user_id || !user_post_id || !status) {
    return res.status(400).json({
      result: "0",
      error: "user_id, user_post_id and valid status (1=like, 2=unlike) are required",
      data: []
    });
  }
 const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
 if(exist_user.length === 0){
  return res.status(400).json({
      result: "0",
      error: "user not fount in database",
      data: []
    });
 }
  try {
    const [existing] = await db.query(
      "SELECT * FROM post_likes WHERE user_id = ? AND user_post_id = ?",
      [user_id, user_post_id]
    );

    if (status == 1) {
      if (existing.length > 0) {
        return res.json({
          result: "1",
          message: "Post already liked",
          liked: true,
          error: "",
          data: []
        });
      }

      await db.query(
        "INSERT INTO post_likes (user_id, user_post_id) VALUES (?, ?)",
        [user_id, user_post_id]
      );

      return res.json({
        result: "1",
        message: "Post liked",
        liked: true,
        error: "",
        data: []
      });

    } else if (status == 2) {
      await db.query(
        "DELETE FROM post_likes WHERE user_id = ? AND user_post_id = ?",
        [user_id, user_post_id]
      );

      return res.json({
        result: "1",
        message: "Post unliked",
        liked: false,
        error: "",
        data: []
      });
    }

  } catch (error) {
    console.error("Error in post_like:", error);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.getPostLikeCount = async (req, res) => {
  const { user_post_id } = req.body;

  if (!user_post_id || isNaN(user_post_id)) {
    return res.status(400).json({
      result: "0",
      error: "user_post_id is required and it must be an Integer",
      data: []
    });
  }

  const [exist_userpost] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
 if(exist_userpost.length === 0){
  return res.status(400).json({
      result: "0",
      error: "user post is not fount in database",
      data: []
    });
 }

  

  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) AS total_likes FROM post_likes WHERE user_post_id = ?",
      [user_post_id]
    );

    return res.json({
      result: "1",
      error: "",
      data: {
        user_post_id,
        total_likes: rows[0].total_likes ?? 0
      }
    });
  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.add_firstcomment = async (req, res) => {
  let { user_id, user_post_id, comment, replies_comment_id = null } = req.body;

  if (!user_id || !user_post_id || !comment) {
    return res.status(400).json({
      result: "0",
      error: "user_id, user_post_id, and comment are required"
    });
  }

  if (!replies_comment_id || replies_comment_id === "0" || replies_comment_id === 0) {
    replies_comment_id = null;
  }
  const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
  if(exist_user.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user not fount in database",
        data: []
      });
  }

  const [exist_post] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
  if(exist_post.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user post is not fount in database",
        data: []
      });
  }

  

  try {
    const [insertResult] = await db.query(
      `INSERT INTO post_comments (user_id, user_post_id, comment, replies_comment_id) 
       VALUES (?, ?, ?, ?)`,
      [user_id, user_post_id, comment, replies_comment_id]
    );

    return res.json({
      result: "1",
      comment_id: insertResult.insertId
    });

  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error"
    });
  }
};

exports.getcomment = async (req, res) => {
  const { user_post_id } = req.body;

  if (!user_post_id) {
    return res.status(400).json({
      result: "0",
      error: "user_post_id is required",
      data: []
    });
  }
  
  const [exist_post] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
  if(exist_post.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user post not fount in database",
        data: []
      });
  }

  
  try {
    const [comments] = await db.query(
      `SELECT c.comment_id, c.user_id, c.comment, c.created_at,
              u.username, u.profile_image,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.comment_id) AS like_count
       FROM post_comments c
       JOIN users u ON c.user_id = u.U_ID
       WHERE c.user_post_id = ? AND c.replies_comment_id IS NULL
       ORDER BY c.created_at DESC`,
      [user_post_id]
    );

    const normalizedComments = comments.map(comment => ({
      comment_id: comment.comment_id ?? 0,
      user_id: comment.user_id ?? 0,
      comment: comment.comment ?? "",
      created_at: comment.created_at ?? "",
      username: comment.username ?? "",
      profile_image: comment.profile_image ?? "",
      like_count: comment.like_count ?? 0,
      replies: comment.replies ?? []
    }));

    if(comments.length === 0){
      return res.status(400).json({
        result: "0",
        error: "no dats in database",
        data: []
      });
    }
    

    res.json({
      result: "1",
      error: "",
      data: normalizedComments
    });

  } catch (err) {
    console.error("Fetch Comments Error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.getreplay_comment = async (req, res) => {
  const { comment_id } = req.body;

  if (!comment_id || isNaN(comment_id)) {
    return res.status(400).json({
      result: "0",
      error: "comment_id is required and it must be an Integer",
      data: []
    });
  }

  const [exist_comment] = await db.query(`select * from post_comments where comment_id = ?`,[comment_id]);
  if(exist_comment.length === 0){
    return res.status(400).json({
      result : "0",
      error : "comment id is not existing in database",
      data : []
    });
  }

  try {
    const [replies] = await db.query(
      `SELECT c.comment_id, c.user_id, c.comment, c.created_at,
              u.username, u.profile_image,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.comment_id) AS like_count
       FROM post_comments c
       JOIN users u ON c.user_id = u.U_ID
       WHERE c.replies_comment_id = ?
       ORDER BY c.created_at ASC`,
      [comment_id]
    );

    const normalized = replies.map(r => ({
      comment_id: r.comment_id ?? 0,
      user_id: r.user_id ?? 0,
      comment: r.comment ?? "",
      created_at: r.created_at ?? "",
      username: r.username ?? "",
      profile_image: r.profile_image ?? "",
      like_count: r.like_count ?? 0
    }));

    res.json({
      result: "1",
      error: "",
      data: normalized
    });

  } catch (err) {
    console.error("Get replies error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.likeComment = async (req, res) => {
  const { user_id, comment_id, user_post_id, status } = req.body;

  if (!user_id || !comment_id || !user_post_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id, comment_id, and user_post_id are required",
      data: []
    });
  }
  const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
  if(exist_user.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user not fount in database",
        data: []
      });
  }
  const [exist_post] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
  if(exist_post.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user post not fount in database",
        data: []
      });
  }
  const [exist_comment] = await db.query (`select * from post_comments where comment_id = ?`, [comment_id]);
  if(exist_comment.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user comment not fount in database",
        data: []
      });
  }

  try {
    const [existing] = await db.query(
      `SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = ?`,
      [user_id, comment_id]
    );

    if (status == 1) {
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO comment_likes (user_id, comment_id, user_post_id) VALUES (?, ?, ?)`,
          [user_id, comment_id, user_post_id]
        );
      }

      return res.json({
        result: "1",
        message: "Comment liked",
        liked: true,
        error: "",
        data: []
      });
    } else if (status == 2) {
      if (existing.length > 0) {
        await db.query(
          `DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?`,
          [user_id, comment_id]
        );
      }

      return res.json({
        result: "1",
        message: "Comment unliked",
        liked: false,
        error: "",
        data: []
      });
    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status. Use 1 for like, 2 for unlike.",
        data: []
      });
    }
  } catch (err) {
    console.error("Like Comment Error:", err);
    return res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};

exports.search = async (req, res) => {
  const { land_type_id, locality, min_price, max_price, user_id } = req.body;

  if (
    !user_id || !land_type_id || !locality || !min_price || !max_price ||
    isNaN(Number(user_id)) || isNaN(Number(land_type_id)) ||
    isNaN(Number(min_price)) || isNaN(Number(max_price))
  ) {
    return res.status(400).json({
      result: "0",
      error: "All fields are required. user_id, land_type_id, min_price, and max_price must be integers.",
      data: []
    });
  }
  const [userExists] = await db.query(`SELECT U_ID FROM users WHERE U_ID = ?`, [user_id]);
    if (userExists.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

  const [land_type_exist] = await db.query(`SELECT * FROM land_types WHERE land_type_id = ?`, [land_type_id]);
    if (land_type_exist.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User land type is not found",
        data: []
      });
    }

  try {
    

    const [existing] = await db.query(
      `SELECT search_id FROM search WHERE user_id = ? AND land_type_id = ?`,
      [user_id, land_type_id]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO search (user_id, land_type_id, create_at) 
         VALUES (?, ?, NOW())`,
        [user_id, land_type_id, locality, min_price, max_price]
      );
    }



    const [rows] = await db.query(
      `SELECT  
          u.username, u.U_ID, u.profile_image, 
          p.user_post_id, p.land_type_id, p.property_name, p.locality, 
          p.price, p.video, p.created_at,
          COUNT(DISTINCT l.like_id) AS like_count,
          COUNT(DISTINCT c.comment_id) AS comment_count
       FROM users u
       JOIN user_posts p ON u.U_ID = p.U_ID
       LEFT JOIN post_likes l ON p.user_post_id = l.user_post_id
       LEFT JOIN post_comments c ON p.user_post_id = c.user_post_id
       WHERE p.land_type_id = ?
         AND p.price BETWEEN ? AND ?
         AND p.locality LIKE ?
       GROUP BY 
         u.username, u.U_ID, u.profile_image,
         p.user_post_id, p.land_type_id, p.property_name, 
         p.locality, p.price, p.video, p.created_at
       ORDER BY p.user_post_id DESC`,
      [land_type_id, min_price, max_price, `%${locality}%`]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        result: "0",
        error : "No data are fount",
        data: []
      });
    }

    const sanitizedRows = rows.map(row => {
      const cleanRow = {};
      for (const key in row) {
        cleanRow[key] = row[key] === null ? "" : row[key];
      }
      return cleanRow;
    });

    return res.status(200).json({
      result: "1",
      data: sanitizedRows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: "Database query failed",
      data: []
    });
  }
};

exports.getInterestedSearchers = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required and it must be an Integer",
      data: []
    });
  }

  const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
  if(exist_user.length === 0){
    return res.status(400).json({
        result: "0",
        error: "user not fount in database",
        data: []
      });
  }
  

  try {
    const [posts] = await db.query(
      `SELECT user_post_id, land_type_id, latitude, longitude 
       FROM user_posts
       WHERE U_ID = ?`, 
      [user_id]
    );

    if (!posts || posts.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "No posts found for this user",
        data: []
      });
    }

    const results = [];
    const seenUserIds = new Set();

    for (const post of posts) {
      const { user_post_id, land_type_id, latitude, longitude } = post;

      const [searchers] = await db.query(
        `SELECT 
            u.U_ID, 
            u.username, 
            u.email, 
            s.land_type_id, 
            u.latitude, 
            u.longitude, 
            s.create_at,
            (6371 * acos(
              cos(radians(?)) * cos(radians(u.latitude)) *
              cos(radians(u.longitude) - radians(?)) +
              sin(radians(?)) * sin(radians(u.latitude))
            )) AS distance
         FROM search s
         JOIN users u ON s.user_id = u.U_ID
         WHERE s.land_type_id = ?
           AND s.user_id != ? 
         HAVING distance <= 30
         ORDER BY distance ASC`,
        [latitude, longitude, latitude, land_type_id, user_id]
      );

      if(searchers.length === 0){
        return res.status(400).json({
          result : "0",
          error : "No matching searchers found within 30 km",
          data :[]
        })
      }

      const uniqueSearchers = searchers.filter(s => {
        if (seenUserIds.has(s.U_ID)) {
          return false;
        } else {
          seenUserIds.add(s.U_ID);
          return true;
        }
      });

      if (uniqueSearchers.length > 0) {
        results.push({
          user_post_id,
          land_type_id,
          latitude,
          longitude,
          searchers: uniqueSearchers
        });
      }
    }

    return res.json({
      result: "1",
      data: results
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: "Internal Server Error",
      data: []
    });
  }
};
