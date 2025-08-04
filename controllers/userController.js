const db = require('../db');

exports.post_user_details = async (req,res) =>{
  try{
    const {user_id,country, state, cities,pincode } = req.body;

  await db.query(
    `UPDATE users SET country = ?, state = ?, cities = ?,pincode = ?
    WHERE U_ID = ?`
  , [country, state, cities, pincode, user_id]);

  res.json({ message: 'Location saved successfully' });
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  }
  
}

exports.updateUserInterest = async (req, res) => {
  try {
    let { user_interest, user_id } = req.body;

    if (Array.isArray(user_interest)) {
      user_interest = user_interest.join(',');
    }

    if (!user_interest || user_interest.trim() === '') {
      user_interest = '1,2,3';
    }

    await db.query(`UPDATE users SET user_interest = ? WHERE U_ID = ?`, [user_interest, user_id]);
    res.json({ message: 'User interest updated successfully.' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserInterest = async (req, res) => {
  try {
    const { U_ID } = req.params;

    const [result] = await db.query(`SELECT user_interest FROM users WHERE U_ID = ?`, [U_ID]);

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user_interest: result[0].user_interest });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, bio, user_id } = req.body;
    const profile_image = req.file ? req.file.filename : null;

    await db.query(
      `UPDATE users SET username = ?, bio = ?, profile_image = ? WHERE U_ID = ?`,
      [username, bio, profile_image, user_id]
    );

    res.json({ message: 'Profile updated successfully' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.followUser = async (req, res) => {
  try {
    const { follower_id, following_id } = req.body;

    if (follower_id === following_id) {
      return res.status(400).json({ message: "You can't follow yourself." });
    }

    const [result] = await db.query(
      `SELECT * FROM followers WHERE follower_id = ? AND following_id = ?`,
      [follower_id, following_id]
    );

    if (result.length > 0) {
      await db.query(
        `DELETE FROM followers WHERE follower_id = ? AND following_id = ?`,
        [follower_id, following_id]
      );
      return res.json({ message: 'Unfollowed successfully' });
    } else {
      await db.query(
        `INSERT INTO followers (follower_id, following_id) VALUES (?, ?)`,
        [follower_id, following_id]
      );
      return res.json({ message: 'Followed successfully' });
    }

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfileStats = async (req, res) => {
  const userId = req.params.id;

  const query = `
    SELECT 
      u.username,
      u.bio,
      u.profile_image,
      (SELECT COUNT(*) FROM user_posts WHERE U_ID = u.U_ID AND is_deleted = 0) AS posts,
      (SELECT COUNT(*) FROM followers WHERE following_id = u.U_ID) AS followers,
      (SELECT COUNT(*) FROM followers WHERE follower_id = u.U_ID) AS following
    FROM users u
    WHERE u.U_ID = ?
  `;

  try {
    const [results] = await db.query(query, [userId]);
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getContact = async (req, res) => {
  const userId = req.params.id;

  try {
    const [result] = await db.query(
      `SELECT phone_num, whatsapp_num, email FROM users WHERE U_ID = ?`,
      [userId]
    );

    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFollowers = async (req, res) => {
  const user_id = req.params.id;

  try {
    const [results] = await db.query(
      `SELECT u.U_ID, u.username, u.profile_image 
       FROM followers f 
       JOIN users u ON f.follower_id = u.U_ID 
       WHERE f.following_id = ?`,
      [user_id]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFollowing = async (req, res) => {
  const userId = req.params.id;

  try {
    const [results] = await db.query(
      `SELECT u.U_ID, u.username, u.profile_image 
       FROM followers f 
       JOIN users u ON f.following_id = u.U_ID 
       WHERE f.follower_id = ?`,
      [userId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveProperty = async (req, res) => {
  const { U_ID, user_post_id } = req.body;

  if (!U_ID || !user_post_id) {
    return res.status(400).json({ message: 'U_ID and user_post_id are required.' });
  }

  try {
    await db.query(
      'INSERT INTO saved_properties (U_ID, user_post_id) VALUES (?, ?)',
      [U_ID, user_post_id]
    );

    return res.json({ success: true, message: 'Property saved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.unsaveProperty = async (req, res) => {
  const { U_ID, user_post_id } = req.body;

  try {
    const [result] = await db.query(
      'DELETE FROM saved_properties WHERE U_ID = ? AND user_post_id = ?',
      [U_ID, user_post_id]
    );

    return res.json({ success: true, message: 'Property unsaved successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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

exports.markAsSold = async (req, res) => {
  const { post_id } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE user_posts SET is_sold = 1, sold_at = NOW() WHERE user_post_id = ?`,
      [post_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Property not found or already sold.' });
    }

    res.json({ success: true, message: 'Property marked as sold.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.unsoldProperty = async (req, res) => {
  const { post_id } = req.body;

  try {
    const [result] = await db.query(
      `UPDATE user_posts SET is_sold = 0, sold_at = NULL WHERE user_post_id = ?`,
      [post_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Property not found or already unsold.' });
    }

    res.json({ success: true, message: 'Property marked as unsold.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.blockUser = async (req, res) => {
  const { blocker_id, blocked_id } = req.body;

  if (blocker_id === blocked_id) {
    return res.status(400).json({ message: "You can't block yourself." });
  }

  try {
    const [result] = await db.query(
      `SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?`,
      [blocker_id, blocked_id]
    );

    if (result.length > 0) {
      return res.status(400).json({ message: "User is already blocked." });
    }

    await db.query(
      `INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`,
      [blocker_id, blocked_id]
    );
    res.json({ message: "User blocked successfully." });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  const { blocker_id, blocked_id } = req.body;

  try {
    const [result] = await db.query(
      `SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?`,
      [blocker_id, blocked_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "User is not blocked." });
    }

    await db.query(
      `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`,
      [blocker_id, blocked_id]
    );

    res.json({ message: "User unblocked successfully." });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBlockedUsers = async (req, res) => {
  const userId = req.params.id;

  try {
    const [results] = await db.query(
      `SELECT u.U_ID, u.username, u.profile_image, b.blocked_at
       FROM blocks b
       JOIN users u ON b.blocked_id = u.U_ID
       WHERE b.blocker_id = ?`,
      [userId]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
