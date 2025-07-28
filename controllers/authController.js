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
        console.log(`OTP for ${phone_num}: ${otp}`);
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

exports.contact =(req,res)=>{
  const userId = req.params.id;
  const { email, whatsapp_num } = req.body;

  if (whatsapp_num) {
    const otp = generateOTP();
    db.query(
      `UPDATE users SET whatsapp_num = ?, whatsapp_otp = ?, whatsapp_otp_created_at = NOW(), email = ? WHERE U_ID = ?`,
      [whatsapp_num, otp, email || null, userId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        console.log(`📲 WhatsApp OTP for ${whatsapp_num}: ${otp}`);
        return res.json({
          message: 'WhatsApp OTP sent and email updated (if provided). Please verify OTP within 30 seconds.'
        });
      }
    );
  }
  else{
    db.query(`UPDATE users SET email = ? WHERE U_ID = ?`, [email, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'Email updated successfully.' });
    });
  }
}

exports.sendWhatsappOtp = (req, res) => {
  const userId = req.params.id;
  const { otp } = req.body;

  if (!otp) {
    return res.status(400).json({ message: 'OTP is required' });
  }

  db.query(
    `SELECT whatsapp_otp, whatsapp_otp_created_at, whatsapp_num FROM users WHERE U_ID = ?`,
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.length === 0) return res.status(404).json({ message: 'User not found' });

      const user = result[0];
      const now = new Date();
      const created = new Date(user.whatsapp_otp_created_at);
      const diffInSeconds = Math.floor((now - created) / 1000);

      if (!user.whatsapp_otp || !user.whatsapp_otp_created_at) {
        return res.status(400).json({ message: 'No OTP found. Please request again.' });
      }

      if (diffInSeconds > 30) {
        db.query(
          `UPDATE users SET whatsapp_num = NULL, whatsapp_otp = NULL, whatsapp_otp_created_at = NULL WHERE U_ID = ?`,
          [userId],
          (err2) => {
            if (err2) return res.status(500).json({ error: err2.message });
            return res.status(400).json({
              message: 'OTP expired. WhatsApp number removed. Please try again.'
            });
          }
        );
      } else if (user.whatsapp_otp !== otp) {
        return res.status(401).json({ message: 'Invalid OTP' });
      } else {
        db.query(
          `UPDATE users SET whatsapp_otp = NULL, whatsapp_otp_created_at = NULL WHERE U_ID = ?`,
          [userId],
          (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            return res.json({ message: 'WhatsApp number verified successfully.' });
          }
        );
      }
    }
  );
};

exports.softDeleteUser = (req, res) => {
  const userId = req.params.id;
  const now = new Date();

  const query = `UPDATE users SET deleted_at = ? WHERE U_ID = ?`;

  db.query(query, [now, userId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ message: 'User account deactivated for 30 days.' });
  });
};

exports.restoreUser = (req, res) => {
  const userId = req.params.id;

  const query = `
    UPDATE users 
    SET deleted_at = NULL 
    WHERE U_ID = ? AND deleted_at IS NOT NULL 
      AND deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
  `;

  db.query(query, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Account cannot be restored or already deleted permanently.' });
    }

    return res.json({ message: 'User account restored successfully.' });
  });
};



