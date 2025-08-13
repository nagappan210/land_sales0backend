const db = require('../db');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const sendOTPEmail = async (to, otp) => {

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: to,
    subject: 'Your OTP Verification Code',
    text: `Your OTP is: ${otp}. It is valid for 30 secondes.`,
  });
};

exports.register = async (req, res) => {
  try {
    const { name, phone_num, device_id , device_type, device_token } = req.body;

    if (!name || !phone_num || !device_id || !device_token || !device_type) {
      return res.status(400).json({ 
        result: "0",
        error: "Name,phone_num,device_id,device_token and device_type are required",
        data: []
      });
    }

    if (isNaN(phone_num)) {
    return res.status(400).json({
        result: "0",
        error: "phone_num must be a Integer",
        data: []
    });
    }

    const [existingUsers] = await db.query(
      'SELECT * FROM users WHERE phone_num = ?',
      [phone_num]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        result: "0",
        error: "User already exists. Please login.",
        data: []
      });
    }

    const otp = generateOTP();
    const defaultNotificationSettings = '1,2,3,4,5';
    const defaultUserInterests = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18';

    const [insertResult] = await db.query(
      `INSERT INTO users (name, phone_num, otp, otp_created_at, allow_notification, notification_settings, user_interest, device_id, device_type, device_token) 
       VALUES (?, ?, ?, NOW(), TRUE, ?, ?, ?, ?, ?)`,
      [name, phone_num, otp, defaultNotificationSettings, defaultUserInterests, device_id , device_type, device_token]
    );

    console.log(`OTP for ${phone_num}: ${otp}`);

    res.json({ 
      result: "1",
      error : "",
      data: [
        {
          user_id: insertResult.insertId,
          name,
          phone_num,
          otp_sent: true
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

exports.login = async (req, res) => {
  try {
    const { action, phone_num } = req.body;

    if (!phone_num) {
      return res.status(400).json({
        result: "0",
        error: "Phone number is required.",
        data: []
      });
    }
    if (isNaN(phone_num)) {
    return res.status(400).json({
        result: "0",
        error: "phone_num must be a Integer",
        data: []
    });
    }

    const [users] = await db.query('SELECT * FROM users WHERE phone_num = ?', [phone_num]);

    if (users.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found. Please register.",
        data: []
      });
    }

    const otp = generateOTP();

    await db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE phone_num = ?',
      [otp, phone_num]
    );

    console.log(`${action === 'resend' ? 'Resent' : 'Sent'} OTP for ${phone_num}: ${otp}`);

    res.json({
      result: "1",
      error: "",
      data: [
        {
          phone_num,
          otp_sent: true
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

exports.verifyOtp = async (req, res) => {
  try {
    const { phone_num, whatsapp_num, email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        result: "0",
        error: "OTP is required.",
        data: []
      });
    }

    if (phone_num && isNaN(phone_num)) {
      return res.status(400).json({
        result: "0",
        error: "phone_num must be a number",
        data: []
      });
    }
    if (whatsapp_num && isNaN(whatsapp_num)) {
      return res.status(400).json({
        result: "0",
        error: "whatsapp_num must be a number",
        data: []
      });
    }
    if (isNaN(otp)) {
      return res.status(400).json({
        result: "0",
        error: "OTP must be a number",
        data: []
      });
    }

    let query, value;
    if (whatsapp_num) {
      query = "SELECT * FROM users WHERE whatsapp_num = ?";
      value = whatsapp_num;
    } else if (phone_num) {
      query = "SELECT * FROM users WHERE phone_num = ?";
      value = phone_num;
    } else if (email) {
      query = "SELECT * FROM users WHERE email = ?";
      value = email;
    } else {
      return res.status(400).json({
        result: "0",
        error: "Phone number, WhatsApp number, or Email is required.",
        data: []
      });
    }

    const [users] = await db.query(query, [value]);
    if (!users.length) {
      return res.status(404).json({
        result: "0",
        error: "User not found.",
        data: []
      });
    }

    const user = users[0];

    if (!user.otp || !user.otp_created_at) {
      return res.status(400).json({
        result: "0",
        error: "No OTP generated. Please request again.",
        data: []
      });
    }

    const now = new Date();
    const created = new Date(user.otp_created_at);
    const diff = Math.floor((now - created) / 1000); 

    if (diff > 300) { 
      await db.query(
        `UPDATE users SET otp = NULL, otp_created_at = NULL WHERE U_ID = ?`,
        [user.U_ID]
      );
      return res.status(400).json({
        result: "0",
        error: "OTP expired. Please request a new one.",
        data: []
      });
    }

    if (user.otp !== otp) {
      return res.status(401).json({
        result: "0",
        error: "Invalid OTP or already resent.",
        data: []
      });
    }

    await db.query(
      `UPDATE users SET otp = NULL, otp_created_at = NULL WHERE U_ID = ?`,
      [user.U_ID]
    );

    const token = jwt.sign(
      { id: user.U_ID },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      result: "1",
      error : "",
      data: [{
        user_id: user.U_ID ?? 0,
        name: user.name ?? "",
        phone_num: user.phone_num ?? "",
        whatsapp_num: user.whatsapp_num ?? "",
        email: user.email ?? "",
        token
      }]
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.contact = async (req, res) => {
  try {
    const { email, whatsapp_num, user_id } = req.body;

    if (!user_id || isNaN(user_id)) {
      return res.status(400).json({
        result: "0",
        error: "user_id is required and it must be an integer",
        data: []
      });
    }


    const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (existing_user.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "User does not exist in table",
        data: []
      });
    }

    if (!email && !whatsapp_num) {
      return res.status(400).json({
        result: "0",
        error: "whatsapp_num or email is required.",
        data: []
      });
    }

    if (whatsapp_num && isNaN(whatsapp_num)) {
      return res.status(400).json({
        result: "0",
        error: "whatsapp_num must be a number.",
        data: []
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        result: "0",
        error: "Invalid email format.",
        data: []
      });
    }

    // Duplicate check for WhatsApp number
    if (whatsapp_num) {
      const [existingWhatsApp] = await db.query(
        "SELECT U_ID FROM users WHERE whatsapp_num = ? AND U_ID != ?",
        [whatsapp_num, user_id]
      );
      if (existingWhatsApp.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "WhatsApp number already in use.",
          data: []
        });
      }
    }

    // Duplicate check for email
    if (email) {
      const [existingEmail] = await db.query(
        "SELECT U_ID FROM users WHERE email = ? AND U_ID != ?",
        [email, user_id]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "Email already in use.",
          data: []
        });
      }
    }

    const otp = generateOTP();
    console.log("Generated OTP:", otp);

    let updateFields = [];
    let values = [];

    if (whatsapp_num) {
      updateFields.push("whatsapp_num = ?");
      values.push(whatsapp_num);
    }
    if (email) {
      updateFields.push("email = ?");
      values.push(email);
    }

    updateFields.push("otp = ?", "otp_created_at = NOW()");
    values.push(otp);

    const query = `UPDATE users SET ${updateFields.join(", ")} WHERE U_ID = ?`;
    values.push(user_id);

    const [result] = await db.query(query, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found or update failed.",
        data: []
      });
    }

    if (email) {
      try {
        await sendOTPEmail(email, otp);
        console.log("Email sent to:", email);
      } catch (e) {
        console.error("Error sending email:", e);
      }
    }

    return res.json({
      result: "1",
      error: "",
      data: [
        {
          user_id,
          whatsapp_num: whatsapp_num || "",
          email: email || "",
          otp_sent: true
        }
      ]
    });

  } catch (err) {
    console.error("Contact error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};



exports.deactivate_or_restore_user = async (req, res) => {
  try {
    const { user_id, status } = req.body;

    if (!user_id || !status) {
      return res.status(400).json({
        result: "0",
        error: "user_id and status are required",
        data: []
      });
    }
    
    const [exist_user] = await db.query (`select * from users where U_ID = ?`,[user_id]);
    if(exist_user.length === 0 ){
      return res.status(400).json({
        result : "0",
        error : "User does not existing in database",
        data : []
      })
    }

    if (status === 1) {
      const now = new Date();
      await db.query(
        `UPDATE users SET deleted_at = ? WHERE U_ID = ?`,
        [now, user_id]
      );

      return res.json({
        result: "1",
        message: "User account deactivated for 30 days.",
        error: "",
        data: []
      });

    } else if (status === 2) {
      const [result] = await db.query(
        `UPDATE users 
         SET deleted_at = NULL 
         WHERE U_ID = ? AND deleted_at IS NOT NULL 
           AND deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [user_id]
      );

      if (result.affectedRows === 0) {
        return res.status(400).json({
          result: "0",
          message: "Account cannot be restored or already deleted permanently.",
          error: "",
          data: []
        });
      }

      return res.json({
        result: "1",
        message: "User account restored successfully.",
        error: "",
        data: []
      });

    } else {
      return res.status(400).json({
        result: "0",
        error: "Invalid status. Use 1 for deactivate, 2 for activate.",
        data: []
      });
    }

  } catch (err) {
    console.error("User status update error:", err);
    return res.status(500).json({
      result: "0",
      error: "Internal server error",
      data: []
    });
  }
};
