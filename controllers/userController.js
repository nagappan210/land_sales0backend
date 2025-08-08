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
    const { user_id, country, state, cities, pincode } = req.body;

    if (!user_id) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required",
        data: []
      });
    }

    await db.query(
      `UPDATE users SET country = ?, state = ?, cities = ?, pincode = ? WHERE U_ID = ?`,
      [country || "", state || "", cities || "", pincode || "", user_id]
    );

    res.json({
      result: "1",
      message: "Location saved successfully",
      error: "",
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

    if (!user_id) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required.",
        message: "Failed to update interest."
      });
    }

    if (Array.isArray(user_interest)) {
      user_interest = user_interest.join(',');
    }

    if (!user_interest || user_interest.trim() === '') {
      user_interest = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20';
    }

    const [result] = await db.query(
      `UPDATE users SET user_interest = ? WHERE U_ID = ?`,
      [user_interest, user_id]
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
      error: ""
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
      error: ""
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

    if (!user_id) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required",
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
      error: "",
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
      u.U_ID AS user_id,
      u.username,
      u.bio,
      u.profile_image,
      (
        SELECT COUNT(*) 
        FROM user_posts 
        WHERE U_ID = u.U_ID 
          AND deleted_at IS NULL 
          AND status = 'published' 
          AND is_sold = 0
      ) AS posts,
      (
        SELECT COUNT(*) 
        FROM followers 
        WHERE following_id = u.U_ID
      ) AS followers,
      (
        SELECT COUNT(*) 
        FROM followers 
        WHERE user_id = u.U_ID
      ) AS following
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

    if (!user_id || !following_id || !status) {
      return res.status(400).json({
        result: "0",
        error: "user_id, following_id, and status are required.",
        data: []
      });
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
        error: "",
        data: []
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
        error: "",
        data: []
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
  const { U_ID, user_post_id, status } = req.body;

  if (!U_ID || !user_post_id || typeof status === 'undefined') {
    return res.status(400).json({
      success: false,
      message: 'U_ID, user_post_id, and status are required.'
    });
  }

  try {
    if (status == 1) {
      // Save property
      await db.query(
        'INSERT IGNORE INTO saved_properties (U_ID, user_post_id) VALUES (?, ?)',
        [U_ID, user_post_id]
      );
      return res.json({ success: true, message: 'Property saved successfully.' });

    } else if (status == 2) {
      // Unsave property
      const [result] = await db.query(
        'DELETE FROM saved_properties WHERE U_ID = ? AND user_post_id = ?',
        [U_ID, user_post_id]
      );
      return res.json({ success: true, message: 'Property unsaved successfully.' });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use 1 for save, 0 for unsave.'
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


exports.getSavedProperties = async (req, res) => {
  const { U_ID } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT p.*
      FROM saved_properties sp
      JOIN user_posts p ON sp.user_post_id = p.user_post_id
      WHERE sp.U_ID = ?
    `, [U_ID]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.sold_status = async (req, res) => {
  const { post_id, status } = req.body;

  if (!post_id || !status) {
    return res.status(400).json({
      success: false,
      message: 'post_id and status are required.'
    });
  }

  try {
    let query = '';
    let message = '';

    if (status == 1) {
      // Unsold
      query = `UPDATE user_posts SET is_sold = 0, sold_at = NULL WHERE user_post_id = ?`;
      message = 'Property marked as unsold.';
    } else if (status == 2) {
      // Sold
      query = `UPDATE user_posts SET is_sold = 1, sold_at = NOW() WHERE user_post_id = ?`;
      message = 'Property marked as sold.';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use 1 for unsold, 2 for sold.'
      });
    }

    const [result] = await db.query(query, [post_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property not found or status already set.'
      });
    }

    return res.json({ success: true, message });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

exports.getDraftPosts = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: []
    });
  }

  try {
    const [posts] = await db.query(
      `SELECT 
         *
       FROM user_posts
       WHERE U_ID = ? 
         AND status = 'draft' 
         AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({
      result: "1",
      error: "",
      data: posts
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
      // BLOCK USER
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
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  try {
    const [userRow] = await db.query(
      "SELECT user_interest FROM users WHERE U_ID = ?",
      [user_id]
    );

    if (userRow.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const interestStr = userRow[0].user_interest;
    const interests = interestStr
      ? interestStr.split(',').map(i => i.trim())
      : [];

    const interestConditions = interests.map(() => 'user_type = ?').join(' OR ');

    const sql = `
      SELECT * FROM user_posts
      WHERE video IS NOT NULL
        AND deleted_at IS NULL
        AND status = 'published'
        AND is_sold = 0
        AND (${interestConditions})
      ORDER BY RAND()
      LIMIT 10
    `;

    const [reels] = await db.query(sql, interests);

    res.json(reels);
  } catch (error) {
    console.error("Error in getReels:", error);
    res.status(500).json({ message: "Internal server error" });
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

  if (!user_post_id) {
    return res.status(400).json({
      result: "0",
      error: "user_post_id is required",
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
  const { user_id, user_post_id, comment, replies_comment_id = null } = req.body;

  if (!user_id || !user_post_id || !comment) {
    return res.status(400).json({
      result: "0",
      error: "user_id, user_post_id, and comment are required",
      data: []
    });
  }

  try {
    await db.query(
      `INSERT INTO post_comments (user_id, user_post_id, comment, replies_comment_id) VALUES (?, ?, ?, ?)`,
      [user_id, user_post_id, comment, replies_comment_id]
    );

    return res.json({
      result: "1",
      error: "",
      data: [
        {
          replies_comment_id: replies_comment_id ?? "0"
        }
      ]
    });

  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
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

  if (!comment_id) {
    return res.status(400).json({
      result: "0",
      error: "comment_id is required",
      data: []
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