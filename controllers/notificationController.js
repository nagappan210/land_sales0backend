const db = require('../db');

exports.getNotificationSettings = async (req, res) => {
  try {
    const { user_id } = req.body;

    const [result] = await db.query(
      `SELECT allow_notification, notification_settings FROM users WHERE U_ID = ?`,
      [user_id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = result[0];
    const ids = user.notification_settings ? user.notification_settings.split(',') : [];

    res.json({
      allow_notification: !!user.allow_notification,
      notification_ids: ids,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateNotificationSettings = async (req, res) => {
  try {
    const { user_id, allow_notification, notification_ids } = req.body;

    if (allow_notification === false) {
      await db.query(
        `UPDATE users SET allow_notification = FALSE, notification_settings = NULL WHERE U_ID = ?`,
        [user_id]
      );
      return res.json({ message: 'All notifications disabled.' });
    }

    const settings = Array.isArray(notification_ids)
      ? notification_ids.join(',')
      : '1,2,3,4,5'; // default fallback if needed

    await db.query(
      `UPDATE users SET allow_notification = TRUE, notification_settings = ? WHERE U_ID = ?`,
      [settings, user_id]
    );

    res.json({ message: 'Notification settings updated.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
