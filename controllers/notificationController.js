const db = require('../db');

exports.getNotificationSettings = async (req, res) => {
  try {
    const { user_id } = req.body;

    const [result] = await db.query(
      `SELECT allow_notification, notification_settings FROM users WHERE U_ID = ?`,
      [user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ 
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const user = result[0];
    const ids = user.notification_settings ? user.notification_settings.split(',') : [];

    res.json({
      result: "1",
      error: "",
      data: [
        {
          allow_notification: !!user.allow_notification,
          notification_ids: ids
        }
      ]
    });

  } catch (err) {
    return res.status(500).json({ 
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const { user_id, allow_notification, notification_ids } = req.body;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required and it must be an Integer",
        data: []
      });
    }

    const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "User does not exist in database",
        data: []
      });
    }

    if (typeof allow_notification !== "boolean") {
      return res.status(400).json({
        result: "0",
        error: "allow_notification must be a boolean value: true or false",
        data: []
      });
    }

    if (allow_notification === false) {
      await db.query(
        `UPDATE users SET allow_notification = FALSE, notification_settings = NULL WHERE U_ID = ?`,
        [user_id]
      );
      return res.json({
        result: "1",
        error: "",
        data: [{ message: "All notifications disabled." }]
      });
    }

    let settingsArray = [];
    if (typeof notification_ids === "string" && notification_ids.trim()) {
      settingsArray = notification_ids.split(",").map(id => parseInt(id.trim(), 10));
    } else if (Array.isArray(notification_ids)) {
      settingsArray = notification_ids.map(id => parseInt(id, 10));
    }

    const validNumbers = [1, 2, 3, 4, 5];

    if (settingsArray.length === 0) {
      settingsArray = validNumbers;
    }

    if (!settingsArray.every(num => validNumbers.includes(num))) {
      return res.status(400).json({
        result: "0",
        error: "Invalid notification_ids. Allowed values are 1,2,3,4,5 only.",
        data: []
      });
    }

    settingsArray = [...new Set(settingsArray)];
    const settings = settingsArray.join(",");

    await db.query(
      `UPDATE users SET allow_notification = TRUE, notification_settings = ? WHERE U_ID = ?`,
      [settings, user_id]
    );

    return res.json({
      result: "1",
      data: [{ message: "Notification settings updated." }]
    });

  } catch (err) {
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};


