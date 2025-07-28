const db = require('../db');
const jwt = require('jsonwebtoken');

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.register = (req, res) => {
  const { name, phone_num } = req.body;
  if (!name || !phone_num) return res.status(400).json({ message: 'Name and phone required' });

  db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length > 0) {
      return res.status(400).json({ message: 'User already exists. Please login.' });
    }

    const otp = generateOTP();
    db.query(
      'INSERT INTO users (name, phone_num, otp, otp_created_at) VALUES (?, ?, ?, NOW())',
      [name, phone_num, otp],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log(`📲 OTP for ${phone_num}: ${otp}`);
        res.json({ message: 'Registered. OTP sent.' });
      }
    );
  });
};

exports.login = (req, res) => {
  const { phone_num } = req.body;
  if (!phone_num) return res.status(400).json({ message: 'Phone number required' });

  db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found. Please register.' });
    }

    const otp = generateOTP();
    db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [otp, phone_num],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log(`📲 OTP for ${phone_num}: ${otp}`);
        res.json({ message: 'OTP sent for login.' });
      }
    );
  });
};

exports.resendOtp = (req, res) => {
  const { phone_num } = req.body;
  if (!phone_num) return res.status(400).json({ message: 'Phone number required' });

  db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    const newOtp = generateOTP();
    db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [newOtp, phone_num],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        console.log(`Resent OTP for ${phone_num}: ${newOtp}`);
        res.json({ message: 'OTP resent successfully.' });
      }
    );
  });
};

exports.verifyOtp = (req, res) => {
  const { phone_num, otp } = req.body;
  if (!phone_num || !otp)
    return res.status(400).json({ message: 'Phone number and OTP required' });

  db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result[0];

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

    db.query(
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
  });
};

