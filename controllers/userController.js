const db = require('../db');

// exports.getContact = async (req, res) => {
//   const userId = req.params.id;

//   try {
//     const [result] = await db.query(
//       `SELECT phone_num, whatsapp_num, email FROM users WHERE U_ID = ?`,
//       [userId]
//     );

//     if (result.length === 0) return res.status(200).json({ message: 'User not found' });

//     res.json(result[0]);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.location = async (req, res) => {
  try {
    const { user_id, country, state, cities, pincode , latitude , longitude } = req.body;

    if (!user_id || !country || !state || !cities || !pincode || !latitude || !longitude ) {
      return res.status(200).json({
        result: "0",
        error: "All Filed are required",
        data: []
      });
    }

    const [existing_user] = await db.query(`select * from users where U_ID = ?` , [user_id]);
    if(existing_user.length ===0){
      return res.status(200).json({
        result : "0",
        error : "User does not exist in table",
        data :[]
      })
    }

    const [row] = await db.query(
      `UPDATE users SET country = ?, state = ?, cities = ?, pincode = ? , latitude = ? , longitude = ? , location_page = 1 WHERE U_ID = ?`,
      [country || "", state || "", cities || "", pincode || "", latitude || "" , longitude || "" , user_id]
    );

    if(row.affectedRows === 0){
      return res.status(200).json({
        result : "0",
        error : "Database does not updated",
        data : []
      });
    }

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
    const limit = 30;
    const offset = (page - 1) * limit;

    const baseImageUrl = process.env.SERVER_ADDRESS + "uploaded/land_categoies/";

    const [results] = await db.query(`
      SELECT land_categorie_id, land_type_id, name, image
      FROM land_categories 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [countResult] = await db.query(`SELECT COUNT(*) AS total FROM land_categories`);
    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nextPage = page < totalPages ? page + 1 : 0;

    if (totalCount === 0 || page > totalPages || results.length === 0) {
      return res.json({
        result: "0",
        error: "No records found",
        data: [],
        totalPages: 0,
        nxtpage: 0,
        recCnt: 0
      });
    }

    const normalized = results.map(r => ({
      land_categorie_id: r.land_categorie_id ?? 0,
      land_type_id: r.land_type_id ?? 0,
      name: r.name ?? "",
      image: r.image ? baseImageUrl + r.image : ""
    }));

    res.json({
      result: "1",
      error: "",
      data: normalized,
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
      return res.status(200).json({
        result: "0",
        error: "user_id is required and must be a valid number.",
        message: "Failed to update interest.",
        data : []
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
      return res.status(200).json({
        result: "0",
        error: "Invalid interest values provided.",
        message: "Failed to update interest.",
        data : []
      });
    }

    validInterests = [...new Set(validInterests)].sort((a, b) => a - b);

    const settingsUser = validInterests.join(",");

    const [result] = await db.query(
      `UPDATE users SET user_interest = ? , interest_page = 1 WHERE U_ID = ?`,
      [settingsUser, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found.",
        message: "No update occurred.",
        data : []
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
      message: "Server error occurred.",
      data : []
    });
  }
};

exports.getUserInterest = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(200).json({
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
      return res.status(200).json({
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
    const {name , bio, user_id , profile_image } = req.body;

    if (!Number.isInteger(Number(user_id))) {
      return res.status(200).json({
        result: "0",
        error: "user_id is required and must be an integer",
        data: []
      });
    }

    const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (existing_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found in the table",
        data: []
      });
    }

    const updateFields = [];
    const values = [];

    if (name) {
      updateFields.push("name = ?");
      values.push(name);
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
      return res.status(200).json({
        result: "0",
        error: "No data provided for update",
        data: []
      });
    }

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE U_ID = ?`;
    values.push(user_id);
    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(200).json({
        result : "0",
        error : "Database does not updated",
        data : []
      })
    }

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

exports.updateUsername = async (req, res) => {
  try {
    const { user_id, username } = req.body;

    if (!user_id || !username || isNaN(user_id)) {
      return res.status(200).json({
        result: "0",
        error: "All fields are required",
        data: []
      });
    }

    const [userRows] = await db.query("SELECT * FROM users WHERE U_ID = ?", [user_id]);
    if (userRows.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const user = userRows[0];

    if (user.username_updated === 1 && user.username_updated_at) {
      const now = new Date();
      console.log('hit');
      
      const diffDays = Math.floor((now - user.username_updated_at) / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        return res.status(200).json({
          result: "0",
          error: `You can only update username once every 30 days. Please try again after ${30 - diffDays} days.`,
          data: []
        });
      }
    }

    await db.query(
      `UPDATE users 
       SET username = ?, username_updated_at = NOW(), username_updated = 1
       WHERE U_ID = ?`,
      [username, user_id]
    );

    return res.json({
      result: "1",
      error: "",
      data: [{ user_id, username }]
    });

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.getProfileStats = async (req, res) => {
  const { user_id, others_id } = req.body;

  if (!user_id) {
    return res.status(200).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }

  const othersIdNum = Number(others_id) || 0;
  const targetId = othersIdNum !== 0 ? othersIdNum : user_id;

  const query = `
    SELECT u.U_ID AS user_id, u.username, u.name, u.bio, u.phone_num_cc, u.phone_num, u.profile_image,
      (SELECT COUNT(*) FROM user_posts WHERE U_ID = u.U_ID AND deleted_at IS NULL AND status = 'published' AND is_sold = 0) AS posts,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.U_ID) AS followers,
      (SELECT COUNT(*) FROM followers WHERE user_id = u.U_ID) AS following
    FROM users u
    WHERE u.U_ID = ? AND u.deleted_at IS NULL
  `;

  try {
    const [results] = await db.query(query, [targetId]);

    if (results.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const profile = results[0];

    let isBlocked = 0;
    if (othersIdNum !== 0) {
      const [blockRows] = await db.query(
        `SELECT COUNT(*) AS blocked
         FROM blocks
         WHERE user_id = ? AND blocker_id = ?`,
        [user_id, othersIdNum]
      );
      isBlocked = blockRows[0].blocked > 0 ? 1 : 0;
    }

    let is_followed = 0;
    let im_followed = 0;
    if (othersIdNum !== 0) {
      const [followRows] = await db.query(
        `SELECT COUNT(*) AS cnt
         FROM followers
         WHERE user_id = ? AND following_id = ?`,
        [user_id, othersIdNum]
      );
      im_followed = followRows[0].cnt > 0 ? 1 : 0;

      const [followBackRows] = await db.query(
        `SELECT COUNT(*) AS cnt
         FROM followers
         WHERE user_id = ? AND following_id = ?`,
        [othersIdNum, user_id]
      );
      is_followed = followBackRows[0].cnt > 0 ? 1 : 0;
    }

    const others_page = othersIdNum !== 0 ? 1 : 0;    

    const normalizeProfile = (profile) => ({
      user_id: profile.user_id,
      username: profile.username || "",
      name: profile.name || "",
      phone_num_cc: profile.phone_num_cc || "",
      phone_num: profile.phone_num || "",
      bio: profile.bio || "",
      profile_image: profile.profile_image || "",
      posts: profile.posts || 0,
      followers: profile.followers || 0,
      following: profile.following || 0,
      is_blocked: isBlocked,
      others_page,
      is_followed,
      im_followed
    });

    return res.json({
      result: "1",
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

exports.getpost_property = async (req, res) => {
  const { user_id, others_id, page = 1 } = req.body;
  console.log(user_id, others_id);
  
  const limit = 10;

  if (!user_id) {
    return res.status(200).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }

  const offset = (parseInt(page, 10) - 1) * limit;
  const targetId = others_id ? others_id : user_id;

  const [blocked] = await db.query(
    `SELECT * FROM blocks WHERE (user_id = ? AND blocker_id = ?) OR (user_id = ? AND blocker_id = ?)`,
    [user_id, others_id, others_id, user_id]
  );

  if (blocked.length > 0) {
    return res.status(200).json({
      result: "0",
      error: "Blocked the users",
      data: []
    });
  }

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM user_posts 
       WHERE U_ID = ? 
         AND status = 'published' 
         AND video IS NOT NULL 
         AND deleted_at IS NULL`,
      [targetId]
    );

    const totalPages = Math.ceil(total / limit);
    const nxtpage = parseInt(page, 10) < totalPages ? parseInt(page, 10) + 1 : 0;

    let query = `
      SELECT 
        up.U_ID, up.user_post_id, up.video, up.thumbnail, up.property_name, up.post_type, up.image_ids,
        up.land_type_id, up.land_categorie_id, up.country AS up_country, up.state AS up_state, 
        up.city AS up_city, up.locality AS up_locality, up.latitude AS up_latitude, 
        up.longitude AS up_longitude, up.bhk_type, up.property_area, up.area_length, 
        up.area_width, up.total_floors, up.floors_allowed, up.parking_available, 
        up.is_boundary_wall, up.furnishing, up.price, up.created_at,
        u.name, u.username, u.profile_image, u.country, u.state, u.cities, 
        u.phone_num_cc, u.phone_num, u.whatsapp_num_cc, u.whatsapp_num, u.email, 
        u.latitude AS user_latitude, u.longitude AS user_longitude,
        COALESCE(pl.total_likes, 0) AS total_likes,
        COALESCE(pc.total_comments, 0) AS total_comments,
        CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked,
        CASE WHEN sp.U_ID IS NOT NULL THEN 1 ELSE 0 END AS is_saved
    `;

    if (others_id) {
      query += `,
        CASE WHEN e.enquire_id IS NOT NULL THEN 1 ELSE 0 END AS enquiry
      `;
    }

    query += `
      FROM user_posts up
      JOIN users u ON u.U_ID = up.U_ID
      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_likes
          FROM post_likes
          GROUP BY user_post_id
      ) pl ON pl.user_post_id = up.user_post_id
      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_comments
          FROM post_comments
          WHERE deleted_at IS NULL
          GROUP BY user_post_id
      ) pc ON pc.user_post_id = up.user_post_id
      LEFT JOIN post_likes ul ON ul.user_post_id = up.user_post_id AND ul.user_id = ?
      LEFT JOIN saved_properties sp ON sp.user_post_id = up.user_post_id AND sp.U_ID = ?
    `;

    if (others_id) {
      query += `
        LEFT JOIN enquiries e ON e.recever_posts_id = up.user_post_id AND e.user_id = ?
      `;
    }

    query += `
      WHERE up.U_ID = ? 
        AND up.status = 'published' 
        AND up.video IS NOT NULL 
        AND up.deleted_at IS NULL
      ORDER BY up.created_at DESC
      LIMIT ? OFFSET ?
    `;

    let params = [];
    if (others_id) {
      params = [user_id, user_id, user_id, targetId, limit, offset];
    } else {
      params = [user_id, user_id, targetId, limit, offset];
    }

    const [reels] = await db.query(query, params);
    const others_page = (others_id && others_id !== 0 && others_id !== "") ? 1 : 0;

    const posts = await Promise.all(reels.map(async (p) => {
      let videoValue = p.video ?? "";
      let imageUrls = [];
      
      if (p.image_ids && p.image_ids !== "Null" && p.image_ids !== "") {
        try {
          const [images] = await db.query(
            `SELECT image_path FROM post_images 
             WHERE user_post_id = ? AND image_id IN (?) 
             ORDER BY FIELD(image_id, ?)`,
            [p.user_post_id, p.image_ids.split(','), p.image_ids.split(',')]
          );
          
          imageUrls = images.map(img => 
            img.image_path ? `${process.env.SERVER_ADDRESS}${img.image_path}` : ""
          );
          
          if (imageUrls.length > 0) {
            videoValue = "";
          }
        } catch (error) {
          console.error("Error fetching images:", error);
        }
      }

      return {
        user_id: p.U_ID ?? 0,
        user_post_id: p.user_post_id ?? 0,
        name: p.name ?? "",
        username: p.username ?? "",
        country: p.country ?? "",
        state: p.state ?? "",
        cities: p.cities ?? "",
        phone_num_cc: p.phone_num_cc ?? "",
        phone_num: p.phone_num ?? "",
        whatsapp_num_cc: p.whatsapp_num_cc ?? "",
        whatsapp_num: p.whatsapp_num ?? "",
        email: p.email ?? "",
        profile_image: p.profile_image ?? "",
        thumbnail: p.thumbnail ? `${process.env.SERVER_ADDRESS}${p.thumbnail}` : 
                  (imageUrls.length > 0 ? imageUrls[0] : ""),
        video: p.video , 
        total_likes: p.total_likes ?? 0,
        total_comments: p.total_comments ?? 0,
        is_liked: p.is_liked ?? 0,
        is_saved: p.is_saved ?? 0,
        enquiry: p.enquiry ?? 0,
        others_page,
        post_property: {
          video: imageUrls.length > 0 ? "" : (p.video ? p.video : ""),
          image_urls: imageUrls,
          post_type: p.post_type ?? "",
          property_name: p.property_name ?? "",
          land_type_id: p.land_type_id ?? "",
          land_categorie_id: p.land_categorie_id ?? "",
          created_at: p.created_at ?? "",
          country: p.up_country ?? "",
          state: p.up_state ?? "",
          city: p.up_city ?? "",
          locality: p.up_locality ?? "",
          latitude: p.up_latitude ?? "",
          longitude: p.up_longitude ?? "",
          bhk_type: p.bhk_type ?? "",
          property_area: p.property_area ?? "",
          area_length: p.area_length ?? "",
          area_width: p.area_width ?? "",
          total_floors: p.total_floors ?? "",
          floors_allowed: p.floors_allowed ?? "",
          parking_available: p.parking_available ?? "",
          is_boundary_wall: p.is_boundary_wall ?? "",
          furnishing: p.furnishing ?? "",
          price: p.price ?? ""
        }
      };
    }));

    if (!posts.length) {
      return res.status(200).json({
        result: "0",
        error: "No Post available",
        data: [],
        page: parseInt(page, 10),
        recCnt: total,
        totalPages,
        nxtpage
      });
    }

    return res.status(200).json({
      result: "1",
      data: posts,
      page: parseInt(page, 10),
      recCnt: total,
      next_page: nxtpage,
      totalPages
    });
  } catch (err) {
    console.error("getpost_property Error:", err);
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
      return res.status(200).json({
        result: "0",
        error: "user_id, following_id, status are required and must be integers",
        data: []
      });
    }

    const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (existing_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User is not existing in database",
        data: []
      });
    }

    const [existing_follower] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [following_id]);
    if (existing_follower.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "Following Id is not existing in database",
        data: []
      });
    }

    if (user_id === following_id) {
      return res.status(200).json({
        result: "0",
        error: "You can't follow yourself.",
        data: []
      });
    }

    const [blocked_users] = await db.query(`select * from blocks where user_id = ? and blocker_id = ?`, [user_id, following_id]);
    if (blocked_users.length > 0) {
      return res.status(200).json({
        result: "0",
        error: "You are blocked by this user",
        data: []
      });
    }

    if (status === 1) {
      const [check] = await db.query(
        `SELECT * FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, following_id]
      );

      if (check.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "Already following.",
          data: []
        });
      }

      const [result] = await db.query(
        `INSERT INTO followers (user_id, following_id, followed_at) VALUES (?, ?, NOW())`,
        [user_id, following_id]
      );

      if (result.affectedRows === 0) {
        return res.status(200).json({
          result: "0",
          error: "Database not updated",
          data: []
        });
      }

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
        return res.status(200).json({
          result: "0",
          error: "Not following.",
          data: []
        });
      }

      const [result] = await db.query(
        `DELETE FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, following_id]
      );

      if (result.affectedRows === 0) {
        return res.status(200).json({
          result: "0",
          error: "Database not updated",
          data: []
        });
      }

      return res.json({
        result: "1",
        message: "Unfollowed successfully",
        status: 2,
      });
    }

    if (status === 3) {
      const [result] = await db.query(
        `DELETE FROM followers WHERE user_id = ? AND following_id = ?`,
        [following_id, user_id]
      );

      if (result.affectedRows === 0) {
        return res.status(200).json({
          result: "0",
          error: "Follower not found",
          data: []
        });
      }

      return res.status(200).json({
        result: "1",
        message: "Follower removed successfully",
        status: 3,
      });
    }

    return res.status(200).json({
      result: "0",
      error: "Invalid status. Use 1 (follow), 2 (unfollow), 3 (remove follower).",
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
  const { user_id, others_id, status, page } = req.body;

  const currentPage = parseInt(page, 10) || 1;
  const limit = 20;

  if (!user_id || !status) {
    return res.status(200).json({
      result: "0",
      error: "user_id and status are required.",
      data: []
    });
  }

  const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
  if (existing_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found in database",
      data: []
    });
  }

  const targetId = (others_id && others_id !== 0) ? others_id : user_id;
  const offset = (currentPage - 1) * limit;
  const profile_images = process.env.SERVER_ADDRESS + "uploaded/profile_images/";

  try {
    const [blocked] = await db.query(
      `SELECT blocker_id as blocked FROM blocks WHERE user_id = ? 
       UNION 
       SELECT user_id as blocked FROM blocks WHERE blocker_id = ?`,
      [user_id, user_id]
    );
    const blockedUsers = blocked.map(b => b.blocked);

    const statusInt = parseInt(status, 10);
    let baseQuery = "";
    let countQuery = "";
    let values = [];
    let countValues = [];

    if (statusInt === 1) {
      // Followers
      baseQuery = `
        SELECT u.U_ID, u.name, u.username, u.profile_image
        FROM followers f
        JOIN users u ON f.user_id = u.U_ID
        WHERE f.following_id = ?
        LIMIT ? OFFSET ?`;

      countQuery = `
        SELECT COUNT(*) as total 
        FROM followers f
        JOIN users u ON f.user_id = u.U_ID
        WHERE f.following_id = ?`;

      values = [targetId, limit, offset];
      countValues = [targetId];

    } else if (statusInt === 2) {
      // Following
      baseQuery = `
        SELECT u.U_ID, u.name, u.username, u.profile_image
        FROM followers f
        JOIN users u ON f.following_id = u.U_ID
        WHERE f.user_id = ?
        LIMIT ? OFFSET ?`;

      countQuery = `
        SELECT COUNT(*) as total 
        FROM followers f
        JOIN users u ON f.following_id = u.U_ID
        WHERE f.user_id = ?`;

      values = [targetId, limit, offset];
      countValues = [targetId];

    } else {
      return res.status(200).json({
        result: "0",
        error: "Invalid status. Use 1 for followers or 2 for following.",
        data: [],
        recCnt: 0,
        totalPages: 0,
        nxtpage: 0
      });
    }

    const [rawData] = await db.query(baseQuery, values);
    const [countResult] = await db.query(countQuery, countValues);

    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nxtpage = currentPage < totalPages ? currentPage + 1 : 0;

    const filteredData = rawData.filter(user => !blockedUsers.includes(user.U_ID));

    const data = await Promise.all(
      filteredData.map(async (user) => {
        const [[userFollows]] = await db.query(
          `SELECT COUNT(*) as cnt FROM followers WHERE user_id = ? AND following_id = ?`,
          [user_id, user.U_ID]
        );

        const [[otherFollows]] = await db.query(
          `SELECT COUNT(*) as cnt FROM followers WHERE user_id = ? AND following_id = ?`,
          [user.U_ID, user_id]
        );

        const [[followersCount]] = await db.query(
          `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`,
          [user.U_ID]
        );
        const [[followingCount]] = await db.query(
          `SELECT COUNT(*) as count FROM followers WHERE user_id = ?`,
          [user.U_ID]
        );

        return {
          user_id: user.U_ID,
          name: user.name,
          username: user.username ?? "",
          profile_image: user.profile_image ? profile_images + user.profile_image : "",
          im_followed: userFollows.cnt > 0 ? 1 : 0,
          is_followed: otherFollows.cnt > 0 ? 1 : 0,
          followers_count: followersCount.count,
          following_count: followingCount.count,
          is_blocked : 0
        };
      })
    );

    res.json({
      result: "1",
      data,
      recCnt: totalCount,
      totalPages,
      nxtpage
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: [],
      recCnt: 0,
      totalPages: 0,
      nxtpage: 0
    });
  }
};

exports.searchfollower = async (req, res) => {
  let { user_id, others_id, status, search, page = 1 } = req.body;

  page = parseInt(page, 10) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  if (!user_id) {
    return res.status(200).json({
      result: "0",
      error: "User_id is required",
      data: []
    });
  }

  try {
    let query = "";
    let params = [];
    const base_url = process.env.SERVER_ADDRESS + "uploaded/profile_image/";
    const targetId = others_id || user_id;

    if (status === 2) {
      query = `
        SELECT u.U_ID, u.name, u.username, u.profile_image
        FROM followers AS f
        JOIN users AS u ON u.U_ID = f.following_id
        WHERE f.user_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.user_id = u.U_ID AND b.blocker_id = ?)
               OR (b.user_id = ? AND b.blocker_id = u.U_ID)
          )
      `;
      params.push(targetId, user_id, user_id);
    } else if (status === 1) {
      query = `
        SELECT u.U_ID, u.name, u.username, u.profile_image
        FROM followers AS f
        JOIN users AS u ON u.U_ID = f.user_id
        WHERE f.following_id = ?
          AND NOT EXISTS (
            SELECT 1 FROM blocks b
            WHERE (b.user_id = u.U_ID AND b.blocker_id = ?)
               OR (b.user_id = ? AND b.blocker_id = u.U_ID)
          )
      `;
      params.push(targetId, user_id, user_id);
    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status value",
        data: []
      });
    }

    if (search && search.length >= 3) {
      query += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ?)`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    } 
    else {
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }

    const [rows] = await db.query(query, params);

    if (rows.length === 0) {
      return res.status(200).json({
        result: search ? "1" : "0",
        data: [],
        recCnt: 0,
        totalPages: 0,
        nxtpage: 0
      });
    }

    const data = await Promise.all(
      rows.map(async (user) => {
        const [[userFollows]] = await db.query(
          `SELECT COUNT(*) as cnt FROM followers WHERE user_id = ? AND following_id = ?`,
          [user_id, user.U_ID]
        );
        const [[otherFollows]] = await db.query(
          `SELECT COUNT(*) as cnt FROM followers WHERE user_id = ? AND following_id = ?`,
          [user.U_ID, user_id]
        );
        const [[followersCount]] = await db.query(
          `SELECT COUNT(*) as count FROM followers WHERE following_id = ?`,
          [user.U_ID]
        );
        const [[followingCount]] = await db.query(
          `SELECT COUNT(*) as count FROM followers WHERE user_id = ?`,
          [user.U_ID]
        );

        return {
          user_id: user.U_ID,
          name: user.name ?? "",
          username: user.username ?? "",
          profile_image: user.profile_image ? base_url + user.profile_image : "",
          im_followed: userFollows.cnt > 0 ? 1 : 0,
          is_followed: otherFollows.cnt > 0 ? 1 : 0,
          followers_count: followersCount.count,
          following_count: followingCount.count,
          is_blocked : 0
        };
      })
    );

    if (search && search.length >= 3) {
      return res.status(200).json({
        result: "1",
        data,
        recCnt: 0,
        totalPages: 0,
        nxtpage: 0

      });
    }

    const totalCountQuery = `SELECT COUNT(*) AS total FROM (${query.replace(/LIMIT.*OFFSET.*/, "")}) AS sub`;
    const [countRows] = await db.query(totalCountQuery, params.slice(0, -2)); // remove limit & offset
    const totalCount = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const nextPage = page < totalPages ? page + 1 : 0;

    return res.status(200).json({
      result: "1",
      data,
      totalPages,
      nxtpage: nextPage,
      recCnt: totalCount
    });

  } catch (err) {
    console.error("Error in searchfollower:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.save_property = async (req, res) => {
  const { user_id, user_post_id, status } = req.body;

  if (!user_id || !user_post_id || typeof status === 'undefined') {
    return res.status(200).json({
      result : "0",
      error: 'U_ID, user_post_id, and status are required.',
      data : []
    });
  }

  if(isNaN(user_id) || isNaN(user_post_id)){
    return res.status(200).json({
      result : "0",
      error: 'U_ID, user_post_id are must be in Integer',
      data : []
    });
  }

  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(200).json({
      result : "0",
      error : "User is not fount in database",
      data : []
    });
  }

  const [existing_post] = await db.query(`select * from user_posts where user_post_id = ?`,[user_post_id]);
  if(existing_post.length === 0 ){
    return res.status(200).json({
      result : "0",
      error : "User post is not fount in database",
      data : []
    });
  }


  try {
    if (status == 1) {
      const [result] = await db.query(
        'INSERT IGNORE INTO saved_properties (U_ID, user_post_id) VALUES (?, ?)',
        [user_id, user_post_id]
      );
      if (result.affectedRows === 0) {
      return res.status(200).json({
        result : "0",
        error : "Database does not updated",
        data : []
      })
    }
      return res.json({ result : "1", 
        message: 'Property saved successfully.',
        data : []
      });

    } else if (status == 2) {
      const [result] = await db.query(
        'DELETE FROM saved_properties WHERE U_ID = ? AND user_post_id = ?',
        [user_id, user_post_id]
      );
      if (result.affectedRows === 0) {
      return res.status(200).json({
        result : "0",
        error : "Database does not updated",
        data : []
      })
    }
      
      return res.json({ result: "1", 
        message: 'Property unsaved successfully.',
        data : []
      });

    } else {
      return res.status(200).json({
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
  const limit = 10;

  if (!user_id) {
    return res.json({
      result: "0",
      error: "user_id is required and it must be an Integer",
      data: []
    });
  }

  const [existing_user] = await db.query(
    `SELECT * FROM users WHERE U_ID = ?`,
    [user_id]
  );
  if (existing_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found in database",
      data: []
    });
  }

  try {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM saved_properties sp
      JOIN user_posts p ON sp.user_post_id = p.user_post_id
      WHERE sp.U_ID = ?
      `,
      [user_id]
    );

    const [rows] = await db.query(
      `
      SELECT p.*
      FROM saved_properties sp
      JOIN user_posts p ON sp.user_post_id = p.user_post_id
      WHERE sp.U_ID = ? order by created_at DESC
      LIMIT ? OFFSET ?
      `,
      [user_id, parseInt(limit), parseInt(offset)]
    );

    const hiddenFields = [
      "is_sold",
      "sold_at",
      "created_at",
      "updated_at",
      "deleted_at",
      "status",
      "post_type",
      "draft"
    ];

    const normalizedData = rows.map((row) => {
      const cleanObj = {};
      for (let key in row) {
        if (!hiddenFields.includes(key)) {
          cleanObj[key] = row[key] == null ? "" : row[key];
        }
      }
      const addressParts = [
        cleanObj.locality,
        cleanObj.city,
        cleanObj.state,
        cleanObj.country
      ].filter(part => part && part.trim() !== "");

      cleanObj.address = addressParts.join(" ,");

      return cleanObj;
    });

    return res.json({
      result: "1",
      data: normalizedData,
      totalPages: Math.ceil(total / limit),
      nxtpage: page < Math.ceil(total / limit) ? page + 1 : 0,
      recCnt: total
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
    return res.status(200).json({
      result: "0",
      error: "user_id, user_post_id, and status are required.",
      data: [],
    });
  }
  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(200).json({
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
      return res.status(200).json({
        result: "0",
        error: "Invalid status. Use 1 for unsold, 2 for sold.",
        data: [],
      });
    }

    const [result] = await db.query(query, [user_post_id, user_id]);

    if (result.affectedRows === 0) {
      return res.status(200).json({
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
    return res.status(200).json({
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
    const [rows] = await db.query(`
      SELECT *
      FROM user_posts
      WHERE U_ID = ? AND is_sold = 1
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [user_id, parseInt(limit), parseInt(offset)]);

    const hiddenFields = [
      "is_sold",
      "sold_at",
      "created_at",
      "updated_at",
      "deleted_at",
      "status",
      "post_type",
      "draft"
    ];

    const normalizedData = rows.map((row) => {
      const cleanObj = {};
      for (let key in row) {
        if (!hiddenFields.includes(key)) {
          cleanObj[key] = row[key] == null ? "" : row[key];
        }
      }
      const addressParts = [
        cleanObj.locality,
        cleanObj.city,
        cleanObj.state,
        cleanObj.country
      ].filter(part => part && part.trim() !== "");

      cleanObj.address = addressParts.join(" ,");
      
      return cleanObj;
    });

    return res.json({
      result: "1",
      data: normalizedData,
      totalPages : Math.ceil(total/limit),
      nxtpage : page < Math.ceil(total/limit) ? page + 1 : 0,
      recCnt : total,
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
    return res.status(200).json({
      result: "0",
      error: "user_id is required and it must be in Integer",
      data: []
    });
  }
  const [existing_user] = await db.query(`select * from users where U_ID = ?`,[user_id]);
  if(existing_user.length === 0 ){
    return res.status(200).json({
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
      `SELECT *
      FROM user_posts
      WHERE U_ID = ?
        AND status = 'draft' 
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?`,
      [user_id, Number(limit), Number(offset)]
    );


    const hiddenFields = [
      "is_sold",
      "sold_at",
      "created_at",
      "updated_at",
      "deleted_at",
      "status",
      "post_type",
    ];
    

    const normalizedData = rows.map((row) => {
      const cleanObj = {};
      for (let key in row) {
        if (!hiddenFields.includes(key)) {
          cleanObj[key] = row[key] == null ? "" : row[key];
        }
      }
      const addressParts = [
        cleanObj.locality,
        cleanObj.city,
        cleanObj.state,
        cleanObj.country
      ].filter(part => part && part.trim() !== "");

      cleanObj.address = addressParts.join(" ,");
      
      return cleanObj;
    });

    if(rows.length === 0){
      return res.status(200).json({
      result : "0",
      error : "No value in database",
      data : []
    });
    }

    res.json({
      result: "1",
      data: normalizedData,
      totalPages: Math.ceil(total / limit),
      nxtpage : page < Math.ceil(total/limit) ? page + 1 :0,
      recCnt:total,
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
    return res.status(200).json({
      result: "0",
      error: "Fill all fields",
      data: []
    });
  }
  const [exist_user] = await db.query(`select * from users where U_ID =?`,[user_id]);
  if(exist_user.length === 0){
      return res.status(200).json({
          result : "0",
          error : "User does not exist in database",
          data : []
        });
      }
  const [exist_blocker] = await db.query(`select * from users where U_ID =?`,[blocker_id  ]);
      if(exist_blocker.length === 0){
        return res.status(200).json({
          result : "0",
          error : "Blocker ID does not exist in database",
          data : []
        });
      }

  if (user_id === blocker_id) {
    return res.status(200).json({
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
        return res.status(200).json({
          result: "0",
          error: "User is already blocked.",
          data: []
        });
      }

      await db.query(
        `INSERT INTO blocks (user_id, blocker_id) VALUES (?, ?)`,
        [user_id, blocker_id]
      );

      await db.query(
        `DELETE FROM followers WHERE user_id = ? AND following_id = ?`,
        [user_id, blocker_id]
      );
      await db.query(
        `DELETE FROM followers WHERE user_id = ? AND following_id = ?`,
        [blocker_id,user_id ]
      );

      await db.query(`
        UPDATE post_comments SET deleted_at = Now() WHERE user_id = ? AND
         user_post_id IN ( SELECT user_post_id FROM user_posts WHERE U_ID = ?) `, [blocker_id,user_id]);

      await db.query(`
        UPDATE post_comments SET deleted_at = NOW() WHERE replies_comment_id IN (SELECT comment_id FROM post_comments WHERE user_id = ? AND user_post_id IN (SELECT user_post_id FROM user_posts WHERE U_ID = ?))
      `, [blocker_id, user_id ]);


      return res.json({
        result: "1",
        message: "User blocked successfully.",
        error: "",
        data: []
      });


    } else if (status === 2) {
      if (existing.length === 0) {
        return res.status(200).json({
          result: "0",
          error: "User is not blocked.",
          data: []
        });
      }

      await db.query(
        `DELETE FROM blocks WHERE user_id = ? AND blocker_id = ?`,
        [user_id, blocker_id]
      );

      await db.query(`
        UPDATE post_comments SET deleted_at = null WHERE user_id = ? AND
         user_post_id IN ( SELECT user_post_id FROM user_posts WHERE U_ID = ?) `, [blocker_id,user_id]);

      await db.query(`
        UPDATE post_comments SET deleted_at = null WHERE replies_comment_id IN (SELECT comment_id FROM post_comments WHERE user_id = ? AND user_post_id IN (SELECT user_post_id FROM user_posts WHERE U_ID = ?))
      `, [blocker_id, user_id ]);

      return res.json({
        result: "1",
        message: "User unblocked successfully.",
        error: "",
        data: []
      });

    } else {
      return res.status(200).json({
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
    return res.status(200).json({
      result: "0",
      error: "user_id is required",
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

  const currentPage = parseInt(page);
  const offset = (currentPage - 1) * limit;

  try {
    const [rawResults] = await db.query(
      `
      SELECT 
        u.U_ID,
        u.name,
        u.username,
        u.profile_image,
        (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.U_ID) AS followers,
        (SELECT COUNT(*) FROM followers f WHERE f.user_id = u.U_ID) AS following,
        EXISTS(SELECT 1 FROM blocks b2 WHERE b2.user_id = ? AND b2.blocker_id = u.U_ID) AS is_blocked,
        EXISTS(SELECT 1 FROM followers f1 WHERE f1.user_id = ? AND f1.following_id = u.U_ID) AS is_followed,
        EXISTS(SELECT 1 FROM followers f2 WHERE f2.user_id = u.U_ID AND f2.following_id = ?) AS im_followed
      FROM blocks b
      JOIN users u ON b.blocker_id = u.U_ID
      WHERE b.user_id = ?
      LIMIT ? OFFSET ?
      `,
      [user_id, user_id, user_id, user_id, limit, offset]
    );

    const [totalCountResult] = await db.query(
      `SELECT COUNT(*) as total FROM blocks WHERE user_id = ?`,
      [user_id]
    );

    const totalCount = totalCountResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);
    const nxtpage = currentPage < totalPages ? currentPage + 1 : 0;
    const profile_images_path = process.env.SERVER_ADDRESS + "uploads/profile/";

    const normalizeUser = (profile) => ({
      user_id: profile.U_ID,
      username: profile.username || "",
      name: profile.name || "",
      profile_image: profile.profile_image ? profile_images_path + profile.profile_image : "",
      followers: profile.followers || 0,
      following: profile.following || 0,
      is_blocked: profile.is_blocked ? 1 : 0,
      is_followed: profile.is_followed ? 1 : 0,
      im_followed: profile.im_followed ? 1 : 0
    });

    const data = rawResults.map(normalizeUser);

    if (data.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "There is no data for this User",
        data: []
      });
    }

    return res.status(200).json({
      result: "1",
      message: "Blocked user list fetched successfully",
      error: "",
      data,
      recCnt: totalCount,
      totalPages,
      nxtpage
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.delete_post = async (req, res) => {
  const { user_id, user_post_id } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(200).json({
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
      return res.status(200).json({
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
    return res.status(200).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }

  const offset = (parseInt(page, 10) - 1) * limit;

  try {
    const [user] = await db.query(
      "SELECT user_interest FROM users WHERE U_ID = ? AND deleted_at IS NULL",
      [user_id]
    );

    if (!user.length) {
      return res.status(200).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const interestIds = user[0].user_interest ? user[0].user_interest.split(",") : [];
    if (interestIds.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "Interest is not found",
        data: []
      });
    }

    const [blocked] = await db.query(
      `SELECT user_id, blocker_id 
       FROM blocks 
       WHERE user_id = ? OR blocker_id = ?`,
      [user_id, user_id]
    );

    const blockedUserIds = [
      ...new Set(
        blocked.map(b =>
          b.user_id === user_id ? b.blocker_id : b.user_id
        )
      )
    ];

    const [reels] = await db.query(
      `
      SELECT  
        up.*,
        u.name,
        u.username,
        u.profile_image,
        u.country,
        u.state,
        u.cities,
        u.phone_num_cc,
        u.phone_num,
        u.whatsapp_num,
        u.whatsapp_num_cc,
        u.email,
        u.latitude,
        u.longitude,
        COALESCE(pl.total_likes, 0) AS total_likes,
        COALESCE(pc.total_comments, 0) AS total_comments,
        CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked,
        CASE WHEN sp.U_ID IS NOT NULL THEN 1 ELSE 0 END AS is_saved,
        CASE WHEN e.enquire_id IS NOT NULL THEN 1 ELSE 0 END AS enquiry
      FROM user_posts up
      JOIN users u ON u.U_ID = up.U_ID
      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_likes
          FROM post_likes
          GROUP BY user_post_id
      ) pl ON pl.user_post_id = up.user_post_id
      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_comments
          FROM post_comments
          WHERE deleted_at IS NULL
          GROUP BY user_post_id
      ) pc ON pc.user_post_id = up.user_post_id
      LEFT JOIN post_likes ul 
          ON ul.user_post_id = up.user_post_id AND ul.user_id = ?
      LEFT JOIN saved_properties sp 
          ON sp.user_post_id = up.user_post_id AND sp.U_ID = ?
      LEFT JOIN enquiries e
          ON e.recever_posts_id = up.user_post_id AND e.user_id = ?
      WHERE up.status = 'published'
        AND up.video IS NOT NULL
        AND up.deleted_at IS NULL
        AND FIND_IN_SET(up.land_categorie_id, ?)
        ${blockedUserIds.length ? `AND up.U_ID NOT IN (${blockedUserIds.map(() => "?").join(",")})` : ""}
      ORDER BY up.created_at DESC
      LIMIT ? OFFSET ?;
      `,
      [
        user_id,
        user_id,
        user_id,
        interestIds.join(","),
        ...blockedUserIds,
        limit,
        offset
      ]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM user_posts up
       JOIN users u ON u.U_ID = up.U_ID
       WHERE FIND_IN_SET(up.land_categorie_id, ?)
         AND up.status = 'published'
         AND up.video IS NOT NULL
         AND up.deleted_at IS NULL
         ${blockedUserIds.length ? `AND up.U_ID NOT IN (${blockedUserIds.join(",")})` : ""}`,
      [interestIds.join(",")]
    );

    const totalPages = Math.ceil(total / limit);
    const nxtpage = parseInt(page, 10) < totalPages ? parseInt(page, 10) + 1 : 0;

    const normalizedReels = await Promise.all(reels.map(async (r) => {
      let videoValue = r.video ?? "";
      let imageUrls = [];

      if (r.image_ids && r.image_ids !== "Null" && r.image_ids !== "") {
        try {
          const [images] = await db.query(
            `SELECT image_path FROM post_images 
             WHERE user_post_id = ? AND image_id IN (?) 
             ORDER BY FIELD(image_id, ?)`,
            [r.user_post_id, r.image_ids.split(','), r.image_ids.split(',')]
          );

          imageUrls = images.map(img => 
            img.image_path ? `${process.env.SERVER_ADDRESS}${img.image_path}` : ""
          );

          if (imageUrls.length > 0) {
            videoValue = "";
          }
        } catch (error) {
          console.error("Error fetching images:", error);
        }
      }

      return {
        user_id: r.U_ID ?? 0,
        user_post_id: r.user_post_id ?? 0,
        name: r.name ?? "",
        username: r.username ?? "",
        country: r.country ?? "",
        state: r.state ?? "",
        cities: r.cities ?? "",
        phone_num_cc: r.phone_num_cc ?? "",
        phone_num: r.phone_num ?? "",
        whatsapp_num_cc: r.whatsapp_num_cc ?? "",
        whatsapp_num: r.whatsapp_num ?? "",
        email: r.email ?? "",
        profile_image: r.profile_image ?? "",
        thumbnail: r.thumbnail ? `${process.env.SERVER_ADDRESS}${r.thumbnail}` : 
                  (imageUrls.length > 0 ? imageUrls[0] : ""),
        video: r.video ,
        total_likes: r.total_likes ?? 0,
        total_comments: r.total_comments ?? 0,
        is_liked: r.is_liked ?? 0,
        is_saved: r.is_saved ?? 0,
        enquiry: r.enquiry ?? 0,
        post_property: {
  user_post_id: r.user_post_id ?? 0,
  user_type: r.user_type ?? "",
  land_type_id: r.land_type_id ?? "",
  land_categorie_id: r.land_categorie_id ?? "",
  country: r.country ?? "",
  state: r.state ?? "",
  city: r.city ?? "",
  locality: r.locality ?? "",
  latitude: r.latitude ?? "",
  longitude: r.longitude ?? "",
  property_name: r.property_name ?? "",
  bhk_type: r.bhk_type ?? "",
  carpet_area: r.carpet_area ?? "",
  property_area: r.property_area ?? "",
  built_up_area: r.built_up_area ?? "",
  super_built_up_area: r.super_built_up_area ?? "",
  facade_width: r.facade_width ?? "",
  facade_height: r.facade_height ?? "",
  area_length: r.area_length ?? "",
  area_width: r.area_width ?? "",
  property_facing: r.property_facing ?? "",
  total_floor: r.total_floor ?? "",
  property_floor_no: r.property_floor_no ?? "",
  property_ownership: r.property_ownership ?? "",
  availability_status: r.availability_status ?? "",
  no_of_bedrooms: r.no_of_bedrooms ?? "",
  no_of_bathrooms: r.no_of_bathrooms ?? "",
  no_of_balconies: r.no_of_balconies ?? "",
  no_of_open_sides: r.no_of_open_sides ?? "",
  no_of_cabins: r.no_of_cabins ?? "",
  no_of_meeting_rooms: r.no_of_meeting_rooms ?? "",
  min_of_seats: r.min_of_seats ?? "",
  max_of_seats: r.max_of_seats ?? "",
  conference_room: r.conference_room ?? "",
  no_of_staircases: r.no_of_staircases ?? "",
  washroom_details: r.washroom_details ?? "",
  reception_area: r.reception_area ?? "",
  pantry: r.pantry ?? "",
  pantry_size: r.pantry_size ?? "",
  central_ac: r.central_ac ?? "",
  oxygen_duct: r.oxygen_duct ?? "",
  ups: r.ups ?? "",
  other_rooms: r.other_rooms ?? "",
  furnishing_status: r.furnishing_status ?? "",
  fire_safety_measures: r.fire_safety_measures ?? "",
  lifts: r.lifts ?? "",
  pre_contract_status: r.pre_contract_status ?? "",
  local_authority: r.local_authority ?? "",
  noc_certified: r.noc_certified ?? "",
  occupancy_certificate: r.occupancy_certificate ?? "",
  office_previously_used_for: r.office_previously_used_for ?? "",
  Parking_available: r.Parking_available ?? "",
  boundary_wall: r.boundary_wall ?? "",
  amenities: r.amenities ?? "",
  suitable_business_type: r.suitable_business_type ?? "",
  price: r.price ?? "",
  property_highlights: r.property_highlights ?? "",
  video: imageUrls.length > 0 ? "" : (r.video ?? ""),
  image_urls: imageUrls,
  thumbnail: r.thumbnail ? `${process.env.SERVER_ADDRESS}${r.thumbnail}` : (imageUrls.length > 0 ? imageUrls[0] : ""),
  
  // Address field
  address: [r.locality, r.city, r.state, r.country]
            .filter(v => v && v.trim() !== "")
            .join(", ")
}

      };
    }));

    if (!normalizedReels.length) {
      return res.status(200).json({
        result: "0",
        error: "No reels available",
        data: [],
        page: parseInt(page, 10),
        recCnt: total,
        totalPages,
        nxtpage
      });
    }

    return res.status(200).json({
      result: "1",
      data: normalizedReels,
      page: parseInt(page, 10),
      recCnt: total,
      totalPages,
      nxtpage
    });

  } catch (err) {
    console.error("getReels Error:", err);
    res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.post_like = async (req, res) => {
  const { user_id, user_post_id, status } = req.body;

  if (!user_id || !user_post_id || !status) {
    return res.status(200).json({
      result: "0",
      error: "user_id, user_post_id and valid status (1=like, 2=unlike) are required",
      data: []
    });
  }
 const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
 if(exist_user.length === 0){
  return res.status(200).json({
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
    return res.status(200).json({
      result: "0",
      error: "user_post_id is required and it must be an Integer",
      data: []
    });
  }

  const [exist_userpost] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
 if(exist_userpost.length === 0){
  return res.status(200).json({
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
  let { user_id, user_post_id, comment, replies_comment_id, status, comment_id , mention_id } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(200).json({
      result: "0",
      error: "user_id and user_post_id are required",
      data : []
    });
  }

  if (!replies_comment_id || replies_comment_id === "0" || replies_comment_id === 0) {
    replies_comment_id = null;
  }

  if (!mention_id || mention_id === "0" || mention_id === 0) {
    mention_id = null;
  }

  const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
  if (exist_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found in database",
      data: []
    });
  }

  const [exist_post] = await db.query(`SELECT * FROM user_posts WHERE user_post_id = ?`, [user_post_id]);
  if (exist_post.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User post not found in database",
      data: []
    });
  }

  const postOwnerId = exist_post[0].U_ID;

  try {
if (String(status) === "1") {
  if (!comment) {
    return res.status(200).json({
      result: "0",
      error: "comment is required for insert"
    });
  }

  let replies_comment_id = req.body.replies_comment_id || null;

  const [insertResult] = await db.query(
    `INSERT INTO post_comments 
      (user_id, user_post_id, comment, replies_comment_id , mention_id)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id, user_post_id, comment, replies_comment_id , mention_id] );

  const [newCommentData] = await db.query(
    `SELECT c.comment_id, c.comment, c.created_at, c.replies_comment_id, c.mention_id , mu.username as mention_username ,  u.U_ID AS user_id, u.username, u.profile_image FROM post_comments c JOIN users u ON c.user_id = u.U_ID LEFT JOIN users mu ON c.mention_id = mu.U_ID  WHERE c.comment_id = ?`,
    [insertResult.insertId]
  );

  let parent_comment_id = 0;

  if (newCommentData.length > 0 && newCommentData[0].replies_comment_id) {
    const currentCommentId = newCommentData[0].comment_id;

    const [rootParent] = await db.query(
      `WITH RECURSIVE parent_path AS (
          SELECT comment_id, replies_comment_id
          FROM post_comments
          WHERE comment_id = ?
          UNION ALL
          SELECT pc.comment_id, pc.replies_comment_id
          FROM post_comments pc
          INNER JOIN parent_path pp ON pc.comment_id = pp.replies_comment_id
      )
      SELECT comment_id 
      FROM parent_path 
      WHERE replies_comment_id IS NULL 
      LIMIT 1`,
      [currentCommentId]
    );

    if (rootParent.length > 0) {
      parent_comment_id = rootParent[0].comment_id;
    }
  }

  const data = newCommentData.map(c => ({
    comment_id: c.comment_id ?? "",
    mention_id : c.mention_id ?? 0,
    mention_username : c.mention_username ?? "",
    parent_comment_id,
    user_id: c.user_id ?? "",
    comment: c.comment ?? "",
    created_at: c.created_at ?? "",
    username: c.username ?? "",
    profile_image: c.profile_image ?? "",
    like_count: 0,
    is_liked: 0,
    author: c.user_id === postOwnerId ? 1 : 0,
    total_reply: 0,
    last_reply: [],
  }));

  return res.json({
    result: "1",
    message: "Inserted comment successfully",
    data: data
  });
}




    if (String(status) === "2") {
      if (!comment || !comment_id) {
        return res.status(200).json({
          result: "0",
          error: "comment and comment_id are required for update"
        });
      }

      const [match] = await db.query(
        `SELECT * FROM post_comments WHERE comment_id = ? AND user_id = ?`,
        [comment_id, user_id]
      );

      if (match.length === 0) {
        return res.status(200).json({
          result: "0",
          error: "You cannot edit this comment",
          data: []
        });
      }

      await db.query(
        `UPDATE post_comments SET comment = ? WHERE comment_id = ?`,
        [comment, comment_id]
      );

      const [newCommentData] = await db.query(`SELECT  c.comment_id,  c.comment,  c.created_at, c.user_id, u.username,  u.profile_image, c.mention_id, mu.username AS mention_username
        FROM post_comments c
        JOIN users u ON c.user_id = u.U_ID
        LEFT JOIN users mu ON c.mention_id = mu.U_ID
        WHERE c.comment_id = ?`,
        [comment_id]
      );

      const data = newCommentData.map(c => ({
        comment_id: c.comment_id ?? "",
        user_id: c.user_id ?? "",
        comment: c.comment ?? "",
        mention_id : c.mention_id ?? 0,
        mention_username : c.mention_username ?? "",
        created_at: c.created_at ?? "",
        username : c.username ?? "",
        profile_image : c.profile_image ?? "",
        like_count :  0,
        is_liked :  0,
        author: c.user_id === postOwnerId ? 1 : 0,
        total_reply : 0,
        last_reply : [],
      }));

      

      return res.json({
        result: "1",
        message: "Updated successfully",
        data : data 
      });
    }

    if (String(status) === "3") {
      if (!comment_id) {
        return res.status(200).json({
          result: "0",
          error: "comment_id is required for delete"
        });
      }

      const [match] = await db.query(
        `SELECT * FROM post_comments WHERE comment_id = ? AND user_id = ?`,
        [comment_id, user_id]
      );

      if (match.length === 0) {
        return res.status(200).json({
          result: "0",
          error: "You cannot delete this comment",
          data: []
        });
      }

      await db.query(
        `UPDATE post_comments SET deleted_at = NOW() WHERE comment_id = ?`,
        [comment_id]
      );

      return res.json({
        result: "1",
        message: "Deleted successfully",
        data: [{
          comment_id: parseInt(comment_id) ?? 0,
          user_id: 0,
          comment: "",
          mention_id: 0,
          mention_username: "",
          created_at: "",
          username: "",
          profile_image: "",
          like_count: 0,
          is_liked: 0,
          author: 0,
          total_reply: 0,
          last_reply: []
        }]
      });
    }

    return res.status(200).json({
      result: "0",
      error: "Invalid status value. Use 1=insert, 2=update, 3=delete",
      data: []
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
  const { user_post_id, user_id, page = 1 } = req.body;
  const limit = 10;

  if (!user_post_id || !user_id) {
    return res.status(200).json({
      result: "0",
      error: "user_post_id and user_id are required",
      data: []
    });
  }

  const [exist_post] = await db.query(
    `SELECT * FROM user_posts WHERE user_post_id = ?`,
    [user_post_id]
  );
  if (exist_post.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "user post not found in database",
      data: []
    });
  }

  const postOwnerId = exist_post[0].U_ID;

  try {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM post_comments
       WHERE user_post_id = ? AND replies_comment_id IS NULL AND deleted_at IS NULL`,
      [user_post_id]
    );

    const [comments] = await db.query(
      `WITH RECURSIVE reply_tree AS (
          SELECT pc.comment_id, pc.replies_comment_id, pc.comment_id AS root_id
          FROM post_comments pc
          WHERE pc.deleted_at IS NULL
          UNION ALL
          SELECT pc.comment_id, pc.replies_comment_id, rt.root_id
          FROM post_comments pc
          INNER JOIN reply_tree rt ON pc.replies_comment_id = rt.comment_id
          WHERE pc.deleted_at IS NULL
       )
       SELECT c.comment_id, c.user_id, c.comment, c.created_at,
              u.username, u.profile_image,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.comment_id) AS like_count,
              (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.comment_id AND user_id = ?) AS is_liked,
              (SELECT COUNT(*) FROM reply_tree r 
               WHERE r.root_id = c.comment_id AND r.comment_id != c.comment_id) AS total_reply
       FROM post_comments c
       JOIN users u ON c.user_id = u.U_ID
       WHERE c.user_post_id = ? AND c.replies_comment_id IS NULL AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [user_id, user_post_id, limitNum, offset]
    );

    const normalizedComments = await Promise.all(
      comments.map(async (comment) => {
        const [lastReply] = await db.query(
          `SELECT r.comment_id, r.replies_comment_id AS parent_comment_id, r.user_id, r.comment, r.created_at, r.mention_id,
                  uu.username, uu.profile_image,
                  mu.username AS mention_username,
                  (SELECT COUNT(*) FROM comment_likes WHERE comment_id = r.comment_id) AS like_count,
                  (SELECT COUNT(*) FROM comment_likes WHERE comment_id = r.comment_id AND user_id = ?) AS is_liked
          FROM post_comments r
          JOIN users uu ON r.user_id = uu.U_ID
          LEFT JOIN users mu ON r.mention_id = mu.U_ID
          WHERE r.replies_comment_id = ? AND r.deleted_at IS NULL
          ORDER BY r.created_at ASC
          LIMIT 1`,
          [user_id, comment.comment_id]
        );

        return {
          comment_id: comment.comment_id ?? 0,
          user_id: comment.user_id ?? 0,
          comment: comment.comment ?? "",
          created_at: comment.created_at ?? "",
          username: comment.username ?? "",
          profile_image: comment.profile_image ?? "",
          like_count: comment.like_count ?? 0,
          is_liked: comment.is_liked > 0 ? 1 : 0,
          author: comment.user_id === postOwnerId ? 1 : 0,
          total_reply: comment.total_reply ?? 0, 
          last_reply: lastReply.length > 0 ? [{
            comment_id: lastReply[0].comment_id ?? "",
            mention_id : lastReply[0].mention_id ?? 0,
            mention_username: lastReply[0].mention_username ?? "",
            parent_comment_id: lastReply[0].parent_comment_id ?? 0,
            user_id: lastReply[0].user_id ?? "",
            comment: lastReply[0].comment ?? "",
            created_at: lastReply[0].created_at ?? "",
            username: lastReply[0].username ?? "",
            profile_image: lastReply[0].profile_image ?? "",
            like_count: lastReply[0].like_count ?? 0,
            is_liked: lastReply[0].is_liked > 0 ? 1 : 0,
            author: lastReply[0].user_id === postOwnerId ? 1 : 0,
          }] : []
        };
      })
    );

    if (comments.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "no data in database",
        data: [],
        totalPages: 0,
         nxtpage: 0, 
         recCnt: 0 ,
        
      });
    }

    res.json({
      result: "1",
      error: "",
      data: normalizedComments,
      totalPages: Math.ceil(total / limitNum),
      nxtpage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : 0,
      recCnt: total
    });

  } catch (err) {
    console.error("Fetch Comments Error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      totalPages: 0, nxtpage: 0, recCnt: 0,
      data: []
    });
  }
};

exports.getreplay_comment = async (req, res) => {
  const { user_post_id, comment_id, user_id, page = 1 } = req.body;
  const limit = 10;

  if (!user_post_id || isNaN(user_post_id)) {
    return res.status(200).json({
      result: "0",
      error: "user_post_id is required and must be an Integer",
      data: []
    });
  }

  const [exist_post] = await db.query(
    `SELECT * FROM user_posts WHERE user_post_id = ?`,
    [user_post_id]
  );
  if (exist_post.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "Post does not exist in database",
      data: []
    });
  }

  const postOwnerId = exist_post[0].U_ID;

  try {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const [replies] = await db.query(
      `
      WITH RECURSIVE reply_tree AS (
        SELECT c.comment_id, c.replies_comment_id, c.user_id, c.comment, c.created_at, c.mention_id
        FROM post_comments c
        WHERE c.replies_comment_id = ?
          AND c.user_post_id = ?
          AND c.deleted_at IS NULL

        UNION ALL

        SELECT pc.comment_id, pc.replies_comment_id, pc.user_id, pc.comment, pc.created_at, pc.mention_id
        FROM post_comments pc
        INNER JOIN reply_tree rt ON pc.replies_comment_id = rt.comment_id
        WHERE pc.deleted_at IS NULL
      )
      SELECT rt.comment_id, rt.replies_comment_id, rt.user_id, rt.comment, rt.created_at,
            rt.mention_id,
            u.username, u.profile_image,
            mu.username AS mention_username,
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = rt.comment_id) AS like_count,
            (SELECT COUNT(*) FROM comment_likes WHERE comment_id = rt.comment_id AND user_id = ?) AS is_liked
      FROM reply_tree rt
      JOIN users u ON rt.user_id = u.U_ID
      LEFT JOIN users mu ON rt.mention_id = mu.U_ID
      ORDER BY rt.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [comment_id, user_post_id, user_id, limitNum, offset]
    );


    const [[{ total }]] = await db.query(
      `
      WITH RECURSIVE reply_tree AS (
        SELECT c.comment_id
        FROM post_comments c
        WHERE c.replies_comment_id = ?
          AND c.user_post_id = ?
          AND c.deleted_at IS NULL

        UNION ALL

        SELECT pc.comment_id
        FROM post_comments pc
        INNER JOIN reply_tree rt ON pc.replies_comment_id = rt.comment_id
        WHERE pc.deleted_at IS NULL
      )
      SELECT COUNT(*) AS total FROM reply_tree
      `,
      [comment_id, user_post_id]
    );

    if (!total || total === 0) {
      return res.status(200).json({
        result: "0",
        error: "No replies found for this comment",
        totalPages: 0,
        nxtpage: 0,
        recCnt: 0,
        data: []
      });
    }

    const normalized = replies.map(r => ({
      comment_id: r.comment_id ?? 0,
      parent_comment_id: r.replies_comment_id ?? 0,
      user_id: r.user_id ?? 0,
      comment: r.comment ?? "",
      mention_id: r.mention_id ?? 0,
      mention_username: r.mention_username ?? "",
      created_at: r.created_at ?? "",
      username: r.username ?? "",
      profile_image: r.profile_image ?? "",
      author: r.user_id === postOwnerId ? 1 : 0,
      like_count: r.like_count ?? 0,
      is_liked: r.is_liked > 0 ? 1 : 0
    }));

    const filtered = normalized.slice(0);

    res.json({
      result: "1",
      error: "",
      data: filtered,
      totalPages: Math.ceil(total / limitNum),
      nxtpage: pageNum < Math.ceil(total / limitNum) ? pageNum + 1 : 0,
      recCnt: total
    });

  } catch (err) {
    console.error("Get replies error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      totalPages: 0,
      nxtpage: 0,
      recCnt: 0,
      data: []
    });
  }
};

exports.likeComment = async (req, res) => {
  const { user_id, comment_id, user_post_id, status } = req.body;

  if (!user_id || !comment_id || !user_post_id) {
    return res.status(200).json({
      result: "0",
      error: "user_id, comment_id, and user_post_id are required",
      data: []
    });
  }
  const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
  if(exist_user.length === 0){
    return res.status(200).json({
        result: "0",
        error: "user not fount in database",
        data: []
      });
  }
  const [exist_post] = await db.query (`select * from user_posts where user_post_id = ?`, [user_post_id]);
  if(exist_post.length === 0){
    return res.status(200).json({
        result: "0",
        error: "user post not fount in database",
        data: []
      });
  }
  const [exist_comment] = await db.query (`select * from post_comments where comment_id = ?`, [comment_id]);
  if(exist_comment.length === 0){
    return res.status(200).json({
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
      return res.status(200).json({
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
  const { land_type_id, locality, min_price, max_price, user_id, page = 1 } = req.body;

  const limit = 10;
  const pageNum = Number(page);
  const offset = (pageNum - 1) * limit;

  if (
    !user_id || !land_type_id || !locality || !min_price || !max_price ||
    isNaN(Number(user_id)) || isNaN(Number(land_type_id)) ||
    isNaN(Number(min_price)) || isNaN(Number(max_price))
  ) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required. user_id, land_type_id, min_price, and max_price must be integers.",
      data: []
    });
  }

  const [userExists] = await db.query(`SELECT U_ID FROM users WHERE U_ID = ?`, [user_id]);
  if (userExists.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found",
      data: []
    });
  }

  const [land_type_exist] = await db.query(`SELECT * FROM land_types WHERE land_type_id = ?`, [land_type_id]);
  if (land_type_exist.length === 0) {
    return res.status(200).json({
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
        `INSERT INTO search (user_id, land_type_id, create_at) VALUES (?, ?, NOW())`,
        [user_id, land_type_id]
      );
    }

    const [countRows] = await db.query(
      `SELECT COUNT(DISTINCT p.user_post_id) AS total
       FROM user_posts p
       WHERE p.land_type_id = ?
         AND p.price BETWEEN ? AND ?
         AND p.locality LIKE ?`,
      [land_type_id, min_price, max_price, `%${locality}%`]
    );

    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit);
    const nxtpage = pageNum < totalPages ? pageNum + 1 : 0;
    const recCnt = total;

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
       ORDER BY p.user_post_id DESC
       LIMIT ? OFFSET ?`,
      [land_type_id, min_price, max_price, `%${locality}%`, limit, offset]
    );

    if (rows.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "No data found",
        data: [],
        totalPages,
        nxtpage, 
        recCnt
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
      data: sanitizedRows,
      totalPages,
      nxtpage,
      recCnt
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
    return res.status(200).json({
      result: "0",
      error: "user_id is required and it must be an Integer",
      data: []
    });
  }

  const [exist_user] = await db.query (`select * from users where U_ID = ?`, [user_id]);
  if(exist_user.length === 0){
    return res.status(200).json({
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
      return res.status(200).json({
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
        `SELECT u.U_ID, u.username, u.email, s.land_type_id, u.latitude, u.longitude, s.create_at,
            (6371 * acos(cos(radians(?)) * cos(radians(u.latitude)) *cos(radians(u.longitude) - radians(?)) +sin(radians(?)) * sin(radians(u.latitude)))) AS distance
         FROM search s
         JOIN users u ON s.user_id = u.U_ID
         WHERE s.land_type_id = ? AND s.user_id != ? 
         HAVING distance <= 30
         ORDER BY distance ASC`,
        [latitude, longitude, latitude, land_type_id, user_id]
      );

      if(searchers.length === 0){
        return res.status(200).json({
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

exports.report_users = async (req, res) => {
  const { user_id, user_post_id, receiver_id, comment_id, status } = req.body;

  try {
    const [exit_user] = await db.query(
      `SELECT * FROM users WHERE U_ID = ? AND deleted_at IS NULL`,
      [user_id]
    );
    if (exit_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "user not found in database",
        data: []
      });
    }

    const [exit_receiver] = await db.query(
      `SELECT * FROM users WHERE U_ID = ? AND deleted_at IS NULL`,
      [receiver_id]
    );
    if (exit_receiver.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "receiver not found in database",
        data: []
      });
    }

    if(user_id === receiver_id){
      return res.status(200).json({
        result : "0",
        error : "You can not report youeself",
        data : []
      });
    }

    if (Number(status) === 1) {
      const [report_users] = await db.query(
        `SELECT * FROM report WHERE user_id = ? AND receiver_id = ? AND status = 1`,
        [user_id, receiver_id]
      );
      if (report_users.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "You have already sent report",
          data: []
        });
      }

      const [rows] = await db.query(
        `SELECT COUNT(*) AS total_reports FROM report WHERE status = 1 AND receiver_id = ?`,
        [receiver_id]
      );
      const reportCount = rows[0]?.total_reports || 0;

      if (reportCount >= 10) {
        await db.query(
          `UPDATE users SET deleted_at = NOW() WHERE U_ID = ?`,
          [receiver_id]
        );
        await db.query(
          `UPDATE user_posts SET deleted_at = NOW() WHERE U_ID = ?`,
          [receiver_id]
        );
        return res.status(200).json({
          result: "1",
          message: "User deleted after too many reports",
          data: []
        });
      }
    }

    if (Number(status) === 2) {
      const [exit_posts] = await db.query(
        `SELECT * FROM user_posts WHERE user_post_id = ? AND U_ID = ? AND deleted_at IS NULL`,
        [user_post_id, receiver_id]
      );
      if (exit_posts.length === 0) {
        return res.status(200).json({
          result: "0",
          error: "post not found in database",
          data: []
        });
      }

      const [report_users] = await db.query(
        `SELECT * FROM report WHERE user_id = ? AND receiver_id = ? AND user_post_id = ? AND status = 2`,
        [user_id, receiver_id, user_post_id]
      );
      if (report_users.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "You have already sent report",
          data: []
        });
      }

      const [rows] = await db.query(
        `SELECT COUNT(*) AS total_count FROM report WHERE status = 2 AND receiver_id = ? AND user_post_id = ?`,
        [receiver_id, user_post_id]
      );
      const reportCount = rows[0]?.total_count || 0;

      if (reportCount >= 10) {
        await db.query(
          `UPDATE user_posts SET deleted_at = NOW() WHERE U_ID = ? AND user_post_id = ?`,
          [receiver_id, user_post_id]
        );
        return res.status(200).json({
          result: "1",
          message: "Post deleted after too many reports",
          data: []
        });
      }
    }

    if (Number(status) === 3) {
      const [exist_comment] = await db.query(
        `SELECT * FROM post_comments WHERE comment_id = ? AND deleted_at IS NULL`,
        [comment_id]
      );
      if (exist_comment.length === 0) {
        return res.status(200).json({
          result: "0",
          error: "comment not found in database",
          data: []
        });
      }

      const [report_comment] = await db.query(
        `SELECT * FROM report WHERE user_id = ? AND receiver_id = ? AND comment_id = ? AND status = 3`,
        [user_id, receiver_id, comment_id]
      );
      if (report_comment.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "You have already sent report",
          data: []
        });
      }

      const [rows] = await db.query(
        `SELECT COUNT(*) AS total_count FROM report WHERE status = 3 AND receiver_id = ? AND comment_id = ?`,
        [receiver_id, comment_id]
      );
      const reportCount = rows[0]?.total_count || 0;

      if (reportCount >= 10) {
        await db.query(
          `UPDATE post_comments SET deleted_at = NOW() WHERE comment_id = ?`,
          [comment_id]
        );
        return res.status(200).json({
          result: "1",
          message: "Comment deleted after too many reports",
          data: []
        });
      }
    }

    const [insert_data] = await db.query(
      `INSERT INTO report (user_post_id, receiver_id, user_id, comment_id, status) VALUES (?, ?, ?, ?, ?)`,
      [user_post_id || null, receiver_id, user_id, comment_id || null, status]
    );

    if (insert_data.affectedRows === 0) {
      return res.status(200).json({
        result: "0",
        error: "Insert fail",
        data: []
      });
    }

    return res.status(200).json({
      result: "1",
      message: "Report submitted successfully",
      data: []
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
