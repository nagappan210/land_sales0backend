const db = require('../db');
require('dotenv').config();

exports.getusertable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT U_ID, name, profile_image , username, phone_num FROM users`
    );

    res.json({
      result: "1",
      error: "",
      data: rows
    });
  } catch (err) {
    console.error("Error fetching user table:", err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};
