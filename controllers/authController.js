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
    const { name, phone_num_cc, phone_num, device_id, device_type, device_token } = req.body;

    if (!phone_num_cc || !phone_num || !device_id || !device_token || !device_type) {
      return res.status(200).json({
        result: "0",
        error: "All fields are required",
        data: []
      });
    }

    const otp = generateOTP();

    const [existingUsers] = await db.query("SELECT * FROM users WHERE phone_num = ?", [phone_num]);
    if (existingUsers && existingUsers.length && existingUsers[0]?.flag === 0) {
      return res.status(200).json({
        result: "0",
        error: "User already exists. Please login.",
        data: []
      });
    } else if (existingUsers && existingUsers.length && existingUsers[0]?.flag === 1) {
const [insertResult] = await db.query(
        `UPDATE users SET otp = ?,otp_created_at = NOW() WHERE U_ID = ?`,
        [
          otp,
          existingUsers[0]?.U_ID
        ]
      );
            return res.json({
        result: "1",
        error: "",
        data: [
          {
            user_id: existingUsers[0]?.U_ID,
            name: existingUsers[0]?.name,
            userName:  existingUsers[0]?.username,
            phone_num_cc: existingUsers[0]?.phone_num_cc,
            phone_num: existingUsers[0]?.phone_num,
            otp
          }
        ]
      });
    } else {
      const [lastUser] = await db.query("SELECT U_ID FROM users ORDER BY U_ID DESC LIMIT 1");
      let newUserName;
      if (lastUser.length > 0) {
        const lastId = lastUser[0].U_ID;
        const nextId = lastId + 1;
        newUserName = `user${String(nextId).padStart(3, "0")}`;
      } else {
        newUserName = "user001";
      }

      const defaultNotificationSettings = "1,2,3,4,5";
      const defaultUserInterests = "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18";

      const [insertResult] = await db.query(
        `INSERT INTO users 
       (name, username, phone_num, otp, phone_num_cc, allow_notification, notification_settings, user_interest, device_id, device_type, device_token, flag) 
       VALUES (?, ?, ?, ?, ?,  TRUE, ?, ?, ?, ?, ?, 1)`,
        [
          name,
          newUserName,
          phone_num,
          otp,
          phone_num_cc,
          defaultNotificationSettings,
          defaultUserInterests,
          device_id,
          device_type,
          device_token
        ]
      );

      return res.json({
        result: "1",
        error: "",
        data: [
          {
            user_id: insertResult.insertId,
            name,
            userName: newUserName,
            phone_num_cc,
            phone_num,
            otp
          }
        ]
      });
    }


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
    const { phone_num, phone_num_cc } = req.body;

    if (!phone_num || !phone_num_cc) {
      return res.status(200).json({
        result: "0",
        error: "All fields are required.",
        data: []
      });
    }


    const [users] = await db.query(
      'SELECT * FROM users WHERE phone_num = ? AND phone_num_cc = ? and flag = 0',
      [phone_num, phone_num_cc]
    );

    if (users.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found. Please register.",
        data: []
      });
    }

    const [band_user] = await db.query(
      'SELECT * FROM users WHERE phone_num = ? AND phone_num_cc = ? and flag = 0 and account_status = 1',
      [phone_num, phone_num_cc]
    );

    if (band_user.length > 0) {
      return res.status(200).json({
        result: "2",
        error: "Your Account is band",
        data: []
      });
    }

    const user = users[0];

    const otp = generateOTP();

    const [row] = await db.query(
      'UPDATE users SET otp = ?, otp_created_at = NOW() WHERE U_ID = ? AND flag = 0',
      [otp, user.U_ID]
    );

    if (row.affectedRows === 0) {
      return res.status(200).json({
        result: "0",
        error: "OTP already exists, please use the existing one.",
        data: []
      });
    }

    return res.status(200).json({
      result: "1",
      error: "",
      data: [
        {
          user_id: user.U_ID,
          phone_num_cc,
          phone_num,
          otp
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
    const { user_id, phone_num, whatsapp_num, email, otp, phone_num_cc, whatsapp_num_cc } = req.body;

    if (!otp) {
      return res.status(400).json({ result: "0", error: "OTP is required.", data: [] });
    }
    if (isNaN(otp)) {
      return res.status(400).json({ result: "0", error: "OTP must be a number.", data: [] });
    }

    let query, value;
    if (whatsapp_num) {
      query = "SELECT * FROM users WHERE whatsapp_num = ? AND whatsapp_num_cc = ? AND U_ID = ?";
      value = [whatsapp_num, whatsapp_num_cc, user_id];
    } else if (phone_num) {
      query = "SELECT * FROM users WHERE phone_num = ? AND phone_num_cc = ? AND U_ID = ?";
      value = [phone_num, phone_num_cc, user_id];
    } else if (email) {
      query = "SELECT * FROM users WHERE email = ? AND U_ID = ?";
      value = [email, user_id];
    } else {
      return res.status(400).json({
        result: "0",
        error: "Phone number, WhatsApp number, or Email is required.",
        data: []
      });
    }

    const [users] = await db.query(query, value);
    if (!users.length) {
      return res.status(404).json({ result: "0", error: "User not found.", data: [] });
    }

    const user = users[0];

    if (!user.otp || !user.otp_created_at) {
      return res.status(400).json({ result: "0", error: "No OTP generated. Please request again.", data: [] });
    }

    const now = new Date();
    const created = new Date(user.otp_created_at);
    const diff = Math.floor((now - created) / 1000);

    if (diff > 30) {
      await db.query(`UPDATE users SET otp = NULL, otp_created_at = NULL, flag = 1 WHERE U_ID = ?`, [user.U_ID]);
      return res.status(200).json({ result: "0", error: "OTP expired. Please request a new one.", data: [] });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(200).json({ result: "0", error: "Invalid OTP.", data: [] });
    }

    await db.query(`UPDATE users SET otp = NULL, otp_created_at = NULL, flag = 0 WHERE U_ID = ?`, [user.U_ID]);

    const token = jwt.sign({ id: user.U_ID }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      result: "1",
      error: "",
      data: [{
        user_id: user.U_ID,
        name: user.name ?? "",
        username: user.username ?? "",
        phone_num_cc: user.phone_num_cc ?? "",
        phone_num: user.phone_num ?? "",
        whatsapp_num_cc: user.whatsapp_num_cc ?? "",
        whatsapp_num: user.whatsapp_num ?? "",
        email: user.email ?? "",
        interest_page: user.interest_page ?? "",
        location_page: user.location_page ?? "",
        token
      }]
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ result: "0", error: err.message, data: [] });
  }
};

exports.contact = async (req, res) => {
  try {
    const { email, whatsapp_num, user_id, whatsapp_num_cc } = req.body;

    if (!user_id || isNaN(user_id)) {
      return res.status(200).json({
        result: "0",
        error: "user_id is required and it must be an integer",
        data: []
      });
    }

    const [existing_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (existing_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User does not exist in table",
        data: []
      });
    }

    if (!email && !whatsapp_num && !whatsapp_num_cc) {
      return res.status(200).json({
        result: "0",
        error: "whatsapp_num, country code or email is required.",
        data: []
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(200).json({
        result: "0",
        error: "Invalid email format.",
        data: []
      });
    }

    if (whatsapp_num && whatsapp_num_cc) {
      const [existingWhatsApp] = await db.query(
        "SELECT U_ID FROM users WHERE whatsapp_num = ? AND whatsapp_num_cc = ? AND U_ID != ?",
        [whatsapp_num, whatsapp_num_cc, user_id]
      );
      if (existingWhatsApp.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "WhatsApp number already in use.",
          data: []
        });
      }
    }

    if (email) {
      const [existingEmail] = await db.query(
        "SELECT U_ID FROM users WHERE email = ? AND U_ID != ?",
        [email, user_id]
      );
      if (existingEmail.length > 0) {
        return res.status(200).json({
          result: "0",
          error: "Email already in use.",
          data: []
        });
      }
    }

    const otp = generateOTP();

    let updateFields = [];
    let values = [];

    if (whatsapp_num) {
      updateFields.push("whatsapp_num = ?");
      values.push(whatsapp_num);
    }
    if (whatsapp_num_cc) {
      updateFields.push("whatsapp_num_cc = ?");
      values.push(whatsapp_num_cc);
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
      return res.status(200).json({
        result: "0",
        error: "User not found or update failed.",
        data: []
      });
    }

    if (email) {
      try {
        await sendOTPEmail(email, otp);
      } catch (e) {
        console.error("Error sending email:", e);
      }
    }

    return res.json({
      result: "1",
      data: [
        {
          user_id,
          whatsapp_num_cc: whatsapp_num_cc || "",
          whatsapp_num: whatsapp_num || "",
          email: email || "",
          otp_sent: true,
          otp
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
      return res.status(200).json({
        result: "0",
        error: "user_id and status are required",
        data: []
      });
    }

    const [exist_user] = await db.query(`select * from users where U_ID = ?`, [user_id]);
    if (exist_user.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User does not existing in database",
        data: []
      })
    }

    if (status === 1) {
      const now = new Date();
      await db.query(
          `UPDATE users u 
           JOIN user_posts up ON u.U_ID = up.U_ID 
           SET u.deleted_at = ?, up.deleted_at = ? 
           WHERE u.U_ID = ?`,
          [now, now, user_id]
        );

      return res.json({
        result: "1",
        message: "User account deactivated for 30 days.",
      });

    } else if (status === 2) {
      const [result] = await db.query(
        `UPDATE users u
     JOIN user_posts up ON u.U_ID = up.U_ID 
     SET u.deleted_at = NULL, up.deleted_at = NULL
     WHERE u.U_ID = ? 
       AND u.deleted_at IS NOT NULL 
       AND u.deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
        [user_id]
      );

      if (result.affectedRows === 0) {
        return res.status(200).json({
          result: "0",
          error: "Account cannot be restored or already deleted permanently.",
          data: []
        });
      }

      return res.json({
        result: "1",
        error: "User account restored successfully.",
        data: []
      });

    } else {
      return res.status(200).json({
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
