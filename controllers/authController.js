const db = require('../db');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTPEmail = async (to, otp) =>{
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your OTP Verification Code',
    text: `Your OTP is: ${otp}. It is valid for 30 seconds.`
  });
}

exports.register = async (req, res) => {
  try {
    const { name, phone_num } = req.body;
    if (!name || !phone_num)
      return res.status(400).json({ message: 'Name and phone required' });

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

exports.handleLoginOtp = async (req, res) => {
  try {
    const { action, phone_num } = req.body;
    if (!phone_num) return res.status(400).json({ message: 'Phone number is required' });

    const [users] = await db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found. Please register.' });
    }

    const otp = generateOTP();

    await db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [otp, phone_num]
    );

    console.log(`${action === 'resend' ? ' Resent' : 'Sent'} OTP for ${phone_num}: ${otp}`);
    res.json({ message: `OTP ${action === 'resend' ? 'resent' : 'sent'} successfully.` });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { phone_num, whatsapp_num, email, otp } = req.body;

    if (!otp) return res.status(400).json({ message: 'OTP is required.' });

    let query = '';
    let value = '';

    if (whatsapp_num) {
      query = 'SELECT * FROM users WHERE whatsapp_num = ?';
      value = whatsapp_num;
    } else if (phone_num) {
      query = 'SELECT * FROM users WHERE phone_num = ?';
      value = phone_num;
    } else if (email) {
      query = 'SELECT * FROM users WHERE email = ?';
      value = email;
    } else {
      return res.status(400).json({ message: 'Phone number, WhatsApp number, or Email is required.' });
    }

    const [users] = await db.query(query, [value]);
    if (!users.length) return res.status(404).json({ message: 'User not found.' });

    const user = users[0];
    const storedOtp = user.otp;
    const createdAt = user.otp_created_at;

    if (!storedOtp || !createdAt) {
      return res.status(400).json({ message: 'No OTP generated. Please request again.' });
    }

    const now = new Date();
    const created = new Date(createdAt);
    const diff = Math.floor((now - created) / 1000);

    if (diff > 300) {
      return res.status(400).json({ message: 'OTP expired. Please resend.' });
    }

    if (storedOtp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP.' });
    }

    const token = jwt.sign(
      { id: user.U_ID, phone: user.phone_num },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    await db.query(`UPDATE users SET otp = NULL, otp_created_at = NULL WHERE U_ID = ?`, [user.U_ID]);

    return res.json({
      message: 'OTP verified successfully.',
      token,
      user: {
        id: user.U_ID,
        name: user.name,
        phone_num: user.phone_num,
        whatsapp_num: user.whatsapp_num,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.contact = async (req, res) => {
  try {
    const { email, whatsapp_num, user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'user_id is required.' });
    }
    const otp = generateOTP();

    if (whatsapp_num || email) {
      await db.query(
        `UPDATE users 
         SET whatsapp_num = ?, otp = ?, otp_created_at = NOW(), email = ? 
         WHERE U_ID = ?`,
        [whatsapp_num || null, otp, email || null, user_id]
      );

     

      if (email) {
        await sendOTPEmail(email, otp);
      }
       console.log(`Generated OTP: ${otp}`);

      return res.json({
        message: 'OTP sent to email (if provided) and WhatsApp number updated.'
      });
    } else {
      return res.status(400).json({ message: 'whatsapp_num or email is required to send OTP.' });
    }

  } catch (err) {
    console.error('Contact error:', err);
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

