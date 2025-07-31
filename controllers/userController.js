const db = require('../db');

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




