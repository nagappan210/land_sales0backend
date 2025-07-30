const db = require('../db');


exports.updateUserInterest = (req, res) => {
  const userId = req.params.id;
  let { user_interest } = req.body;

  if (Array.isArray(user_interest)) {
    user_interest = user_interest.join(',');
  }

  if (!user_interest || user_interest.trim() === '') {
    user_interest = '1,2,3';
  }

  const query = `UPDATE users SET user_interest = ? WHERE U_ID = ?`;
  db.query(query, [user_interest, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    return res.json({ message: 'User interest updated successfully.' });
  });
};


exports.getUserInterest = (req, res) => {
  const { U_ID } = req.params;

  db.query(`SELECT user_interest FROM users WHERE U_ID = ?`, [U_ID], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    const interests = result[0].user_interest; 
    res.json({ user_interest: interests });
  });
};


exports.updateProfile = (req, res) => {
  const { id } = req.params;
  const { username, bio } = req.body;
  const profile_image = req.file ? req.file.filename : null;

  const sql = `UPDATE users SET username = ?, bio = ?, profile_image = ? WHERE U_ID = ?`;
  db.query(sql, [username, bio, profile_image, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Profile updated successfully' });
  });
};

exports.followUser = (req,res)=>{
    const { follower_id, following_id } = req.body;

    if (follower_id === following_id) {
        return res.status(400).json({ message: "You can't follow yourself." });
    }

    db.query(`select * from followers where follower_id = ? and following_id =?`,[follower_id,following_id],(err,result)=>{
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0){

            db.query(`DELETE FROM followers WHERE follower_id = ? AND following_id = ?`,[follower_id, following_id],(err2)=>{
                if (err2) return res.status(500).json({ error: err2.message });
                return res.json({ message: 'Unfollowed successfully' });
            });
        }
        else{
            db.query(
          'INSERT INTO followers (follower_id, following_id) VALUES (?, ?)',
          [follower_id, following_id],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            return res.json({ message: 'Followed successfully' });
          });
    }
    });
}

exports.getProfileStats = (req, res) => {
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

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  });
};

exports.getcontact = (req, res) => {
  const userId = req.params.id;

  const query = `SELECT phone_num, whatsapp_num, email FROM users WHERE U_ID = ?`;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(result[0]);
  });
};

exports.getFollowers = (req,res)=>{
    const user_id = req.params.id;

    const query = `select u.U_ID,u.username,u.profile_image FROM followers f JOIN users u ON f.follower_id = u.U_ID 
    WHERE f.following_id = ?`;

    db.query(query, [user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
}

exports.getFollowing = (req, res) => {
  const userId = req.params.id;

  const query = `
    SELECT u.U_ID, u.username, u.profile_image 
    FROM followers f 
    JOIN users u ON f.following_id = u.U_ID 
    WHERE f.follower_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};

exports.blockUser = (req, res) => {
  const { blocker_id, blocked_id } = req.body;

  if (blocker_id === blocked_id) {
    return res.status(400).json({ message: "You can't block yourself." });
  }

  const checkQuery = `SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?`;
  db.query(checkQuery, [blocker_id, blocked_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length > 0) {
      return res.status(400).json({ message: "User is already blocked." });
    }

    const insertQuery = `INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`;
    db.query(insertQuery, [blocker_id, blocked_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      return res.json({ message: "User blocked successfully." });
    });
  });
};

exports.unblockUser = (req, res) => {
  const { blocker_id, blocked_id } = req.body;

  const checkQuery = `SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?`;
  db.query(checkQuery, [blocker_id, blocked_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: "User is not blocked." });
    }

    const deleteQuery = `DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`;
    db.query(deleteQuery, [blocker_id, blocked_id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      return res.json({ message: "User unblocked successfully." });
    });
  });
};

exports.getBlockedUsers = (req, res) => {
  const userId = req.params.id;

  const query = `
    SELECT u.U_ID, u.username, u.profile_image, b.blocked_at
    FROM blocks b
    JOIN users u ON b.blocked_id = u.U_ID
    WHERE b.blocker_id = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
};




