const db = require('../db');
const jwt = require('jsonwebtoken');
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

exports.register = async (req, res) => {
  try {
    const { name, phone_num } = req.body;
    if (!name || !phone_num)
      return res.status(400).json({ message: 'Name and phone required' });

    // ✅ Await SELECT query
    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE phone_num = ?',
      [phone_num]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists. Please login.' });
    }

    // ✅ Continue registration
    const otp = generateOTP();
    const defaultNotificationSettings = '1,2,3,4,5';
    const defaultUserInterests = '1,2,3';

    await db.query(
      `INSERT INTO users (name, phone_num, otp, otp_created_at, allow_notification, notification_settings, user_interest) 
       VALUES (?, ?, ?, NOW(), TRUE, ?, ?)`,
      [name, phone_num, otp, defaultNotificationSettings, defaultUserInterests]
    );

    console.log(`📲 OTP for ${phone_num}: ${otp}`);
    res.json({ message: 'Registered. OTP sent.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone_num } = req.body;
    if (!phone_num) return res.status(400).json({ message: 'Phone number required' });

    const [users] = await db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found. Please register.' });
    }

    const otp = generateOTP();
    await db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [otp, phone_num]
    );

    console.log(`📲 OTP for ${phone_num}: ${otp}`);
    res.json({ message: 'OTP sent for login.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { phone_num } = req.body;
    if (!phone_num) return res.status(400).json({ message: 'Phone number required' });

    const [users] = await db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newOtp = generateOTP();
    await db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [newOtp, phone_num]
    );

    console.log(`Resent OTP for ${phone_num}: ${newOtp}`);
    res.json({ message: 'OTP resent successfully.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  
  
  try {
    
    const { phone_num, otp } = req.body;
    console.log('hit');
    if (!phone_num || !otp)
      return res.status(400).json({ message: 'Phone number and OTP required' });

    const [users] = await db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = users[0];

    if (!user.otp || !user.otp_created_at) {
      return res.status(400).json({ message: 'No OTP generated. Please request again.' });
    }

    const now = new Date();
    const created = new Date(user.otp_created_at);
    const diff = Math.floor((now - created) / 1000);

    if (diff > 30) {
      return res.status(400).json({ message: 'OTP expired. Please resend.' });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    const token = jwt.sign(
      { id: user.U_ID, phone: user.phone_num },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    await db.query(
      'UPDATE users SET otp = NULL, otp_created_at = NULL WHERE U_ID = ?',
      [user.U_ID]
    );

    res.json({
      message: 'OTP verified. Login successful.',
      token,
      user: {
        id: user.U_ID,
        name: user.name,
        phone_num: user.phone_num,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.contact = async (req, res) => {
  try {
    const { email, whatsapp_num, user_id } = req.body;

    if (whatsapp_num) {
      const otp = generateOTP();

      await db.query(
        `UPDATE users 
         SET whatsapp_num = ?, whatsapp_otp = ?, whatsapp_otp_created_at = NOW(), email = ? 
         WHERE U_ID = ?`,
        [whatsapp_num, otp, email || null, user_id]
      );

      console.log(`WhatsApp OTP for ${whatsapp_num}: ${otp}`);
      return res.json({
        message: 'WhatsApp OTP sent and email updated (if provided). Please verify OTP within 30 seconds.'
      });
    } else {
      await db.query(`UPDATE users SET email = ? WHERE U_ID = ?`, [email, user_id]);
      return res.json({ message: 'Email updated successfully.' });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.sendWhatsappOtp = async (req, res) => {
  try {
    const { otp, user_id } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    const [users] = await db.query(
      `SELECT whatsapp_otp, whatsapp_otp_created_at, whatsapp_num FROM users WHERE U_ID = ?`,
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    if (!user.whatsapp_otp || !user.whatsapp_otp_created_at) {
      return res.status(400).json({ message: 'No OTP found. Please request again.' });
    }

    const now = new Date();
    const created = new Date(user.whatsapp_otp_created_at);
    const diffInSeconds = Math.floor((now - created) / 1000);

    if (diffInSeconds > 30) {
      await db.query(
        `UPDATE users SET whatsapp_num = NULL, whatsapp_otp = NULL, whatsapp_otp_created_at = NULL WHERE U_ID = ?`,
        [user_id]
      );
      return res.status(400).json({
        message: 'OTP expired. WhatsApp number removed. Please try again.'
      });
    }

    if (user.whatsapp_otp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }

    await db.query(
      `UPDATE users SET whatsapp_otp = NULL, whatsapp_otp_created_at = NULL WHERE U_ID = ?`,
      [user_id]
    );

    return res.json({ message: 'WhatsApp number verified successfully.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.softDeleteUser = async (req, res) => {
  try {
    const { user_id } = req.body;
    const now = new Date();

    await db.query(
      `UPDATE users SET deleted_at = ? WHERE U_ID = ?`,
      [now, user_id]
    );

    return res.json({ message: 'User account deactivated for 30 days.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const { user_id } = req.body;

    const [result] = await db.query(
      `UPDATE users 
       SET deleted_at = NULL 
       WHERE U_ID = ? AND deleted_at IS NOT NULL 
         AND deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Account cannot be restored or already deleted permanently.' });
    }

    return res.json({ message: 'User account restored successfully.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

