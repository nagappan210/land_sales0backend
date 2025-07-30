const db = require('../db');

exports.getAllLandTypes = (req, res) => {
  db.query('SELECT * FROM land_types', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ result:1, data: results,message:"Data fetched" });
  });
};

exports.getCategoriesByLandType = (req, res) => {
  const land_type_id = req.params.id;

  db.query(
    'SELECT * FROM land_categories WHERE land_type_id = ?',
    [land_type_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ result:1, data: results,message:"Data fetched" });
    }
  );
};

exports.createPostStep1 = (req, res) =>{
    const{U_ID,user_type} = req.body;

    if (!U_ID || !user_type) {
        return res.status(400).json({ message: 'U_ID and user_type are required.' });
    }

    if (!['owner', 'broker'].includes(user_type)) {
        return res.status(400).json({ message: 'Invalid user_type. Must be "owner" or "broker".' });
    }

    const query = `INSERT INTO user_posts (U_ID, user_type) VALUES (?, ?)`;
  db.query(query, [U_ID, user_type], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      message: 'User type inserted successfully.',
      U_ID: result.insertId
    });
  });
}

exports.createPostStep2 = (req, res) => {
  const { U_ID, land_type_id, land_categorie_id } = req.body;

  if (!U_ID || !land_type_id || !land_categorie_id) {
    return res.status(400).json({ message: 'U_ID, land_type_id, and land_categorie_id are required.' });
  }

  const sql = `UPDATE user_posts SET land_type_id = ?, land_categorie_id = ? WHERE U_ID = ?`;

  db.query(sql, [land_type_id, land_categorie_id, U_ID], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Post not found with given user_post_id.' });
    }

    res.json({
      message: 'Step 2 completed: land_type and category updated.',
      U_ID
    });
  });
};
