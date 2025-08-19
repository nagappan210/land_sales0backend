const db = require('../db');
require('dotenv').config();

exports.getusertable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT U_ID, name, profile_image , username, phone_num FROM users where deleted_at is null and otp is null  `
    );
    res.json({ result: "1", error: "", data: rows});
  } catch (err) {
    console.error("Error fetching user table:", err);
    res.status(500).json({ result: "0", error: err.message, data: [] });
  }
};

exports.edituser = async (req, res) => {
  const { user_id, name, username, profile_image } = req.body;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: [],
    });
  }

  try {
    const fields = [];
    const values = [];
    if (username !== undefined) {
      const [existing] = await db.query(
        `SELECT * FROM users WHERE username = ?`,
        [username]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "Username already exists",
          data: [],
        });
      }

      fields.push("username = ?");
      values.push(username);
    }

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (profile_image !== undefined) {
      fields.push("profile_image = ?");
      values.push(profile_image);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "No fields provided to update",
        data: [],
      });
    }
    fields.push("updated_at = NOW()");
    values.push(user_id);

    const [row] = await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE U_ID = ?`,
      values
    );

    if (row.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: [],
      });
    }

    return res.json({
      result: "1",
      message: "User updated successfully",
      data: [],
    });
  } catch (err) {
    console.error("Edit user error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error while updating user",
      data: [],
    });
  }
};

exports.deleteuser = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: [],
    });
  }

  try {
    const [row] = await db.query(
      `UPDATE users SET deleted_at = NOW() WHERE U_ID = ?`,
      [user_id]
    );

    if (row.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found or already deleted",
        data: [],
      });
    }

    return res.json({
      result: "1",
      message: "User deleted successfully",
      data: [],
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error while deleting user",
      data: [],
    });
  }
};
