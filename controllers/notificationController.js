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

    if (!user_id) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required",
        data: []
      });
    }

    if (allow_notification === false || allow_notification === 'false') {
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

    const settings = typeof notification_ids === 'string' ? notification_ids : '1,2,3,4,5';

    await db.query(
      `UPDATE users SET allow_notification = TRUE, notification_settings = ? WHERE U_ID = ?`,
      [settings, user_id]
    );

    res.json({
      result: "1",
      error: "",
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



