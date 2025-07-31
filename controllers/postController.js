const db = require('../db');


exports.getAllLandTypes = async (req, res) => {
  try {
    const [results] = await db.query('SELECT * FROM land_types');
    res.json({ result: 1, data: results, message: 'Data fetched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategoriesByLandType = async (req, res) => {
  const land_type_id = req.params.id;

  try {
    const [results] = await db.query(
      'SELECT * FROM land_categories WHERE land_type_id = ?',
      [land_type_id]
    );
    res.json({ result: 1, data: results, message: 'Data fetched' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPostStep1 = async (req, res) => {
  const { U_ID, user_type } = req.body;

  if (!U_ID || !user_type) {
    return res.status(400).json({ message: 'U_ID and user_type are required.' });
  }

  if (!['owner', 'broker'].includes(user_type)) {
    return res.status(400).json({ message: 'Invalid user_type. Must be "owner" or "broker".' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO user_posts (U_ID, user_type) VALUES (?, ?)`,
      [U_ID, user_type]
    );

    res.status(201).json({
      message: 'User type inserted successfully.',
      U_ID,
      post_id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPostStep2 = async (req, res) => {
  const { U_ID, land_type_id, land_categorie_id } = req.body;

  if (!U_ID || !land_type_id || !land_categorie_id) {
    return res.status(400).json({ message: 'U_ID, land_type_id, and land_categorie_id are required.' });
  }

  const sql = `
    UPDATE user_posts 
    SET land_type_id = ?, land_categorie_id = ?, updated_at = NOW() 
    WHERE U_ID = ?
  `;

  try {
    const [result] = await db.query(sql, [land_type_id, land_categorie_id, U_ID]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Post not found with given U_ID.' });
    }

    res.json({
      message: 'Step 2 completed: land_type and category updated.',
      U_ID
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPostStep4 = async (req, res) => {
  const {
    user_id, property_name, bhk_type, property_area, area_length, area_width,
    total_floors, property_floor, is_boundary_wall, furnishing,
    parking_available, ownership_type, availability_status
  } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  const query = `
    UPDATE user_posts 
    SET 
      property_name = ?, 
      bhk_type = ?, 
      property_area = ?, 
      area_length = ?, 
      area_width = ?, 
      total_floors = ?, 
      property_floor = ?, 
      is_boundary_wall = ?, 
      furnishing = ?, 
      parking_available = ?, 
      ownership_type = ?, 
      availability_status = ?, 
      updated_at = NOW()
    WHERE U_ID = ?
  `;

  const values = [
    property_name || null,
    bhk_type || null,
    property_area || null,
    area_length || null,
    area_width || null,
    total_floors || null,
    property_floor || null,
    is_boundary_wall ? 1 : 0,
    furnishing || null,
    parking_available ? 1 : 0,
    ownership_type || null,
    availability_status || null,
    user_id
  ];

  try {
    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Post not found with given user_id.' });
    }

    res.json({ message: 'Step 4 completed: Property details added.', user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPostStep5 = async (req, res) => {
  const { user_id, price } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  try {
    const [result] = await db.query(
      `UPDATE user_posts SET price = ?, updated_at = NOW() WHERE U_ID = ?`,
      [price || 0, user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Post not found with given user_id.' });
    }

    res.json({ message: 'Step 5 completed: Price added.', user_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};






