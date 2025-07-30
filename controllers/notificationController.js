const db = require('../db');

exports.getNotificationSettings = (req, res) => {
  const userId = req.params.id;

  const query = `SELECT allow_notification, notification_settings FROM users WHERE U_ID = ?`;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result[0];
    const ids = user.notification_settings ? user.notification_settings.split(',').map(Number) : [];

    res.json({
      allow_notification: !!user.allow_notification,
      notification_ids: ids,
    });
  });
};


exports.updateNotificationSettings = (req, res) => {
  const userId = req.params.id;
  const { allow_notification, notification_ids } = req.body;

  if (allow_notification === false) {
    db.query(
      `UPDATE users SET allow_notification = FALSE, notification_settings = NULL WHERE U_ID = ?`,
      [userId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'All notifications disabled.' });
      }
    );
  } else {
    const settings = (Array.isArray(notification_ids) && notification_ids.length > 0)
      ? notification_ids.join(',')
      : '1,2,3,4,5';

    db.query(
      `UPDATE users SET allow_notification = TRUE, notification_settings = ? WHERE U_ID = ?`,
      [settings, userId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notification settings updated.' });
      }
    );
  }
};