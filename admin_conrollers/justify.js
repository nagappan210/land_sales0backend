const db = require('../db')
require('dotenv').config()

exports.account_justify = async (req, res) => {
  const { phone_num_cc, phone_num } = req.body;

  if (!phone_num || !phone_num_cc) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required",
      data: []
    });
  }

  try {
    const [check] = await db.query(
      `SELECT U_ID, username, name, email,profile_image, phone_num, phone_num_cc, account_status 
       FROM users WHERE phone_num = ? AND phone_num_cc = ?`,
      [phone_num, phone_num_cc]
    );

    if (check.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    const user = check[0];

    if (user.account_status === 0) {
      return res.status(200).json({
        result: "0",
        error: "The user account is not banned",
        data: []
      });
    }

    const [reports] = await db.query(
      `SELECT r.report_sentence_id, rs.report_sentence, COUNT(*) AS times_reported
       FROM report r
       JOIN report_sentence rs ON r.report_sentence_id = rs.report_sentence_id
       WHERE r.receiver_id = ? AND r.status = 1
       GROUP BY r.report_sentence_id
       ORDER BY times_reported DESC limit 1`,
      [user.U_ID]
    );

    const [reportCount] = await db.query(
      `SELECT COUNT(*) AS total_reports 
       FROM report 
       WHERE receiver_id = ? AND status = 1`,
      [user.U_ID]
    );

    if (reportCount[0].total_reports < 10) {
      return res.status(200).json({
        result: "0",
        error: "User is not blocked (less than 10 reports)",
        data: []
      });
    }

    return res.status(200).json({
      result: "1",
      message: "User is banned, please justify",
      data: {
        user_details: {
          user_id: user.U_ID,
          username: user.username,
          name: user.name,
          email: user.email,
          phone_num: user.phone_num,
          phone_num_cc: user.phone_num_cc,
          profile_image : user.profile_image
        },
        reports: reports
      }
    });

  } catch (err) {
    console.error("account_justify error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.submit_justify = async (req, res) => {
  const { user_id, name, email, reason_appeal } = req.body;

  const files = req.files || [];

  if (!user_id || !name || !email || !reason_appeal) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required",
      data: []
    });
  }

  const [exist_user] = await db.query(`select * from justify_users where user_id = ? and email = ?` , [user_id , email || null]);
  if (exist_user.length > 0) {
      return res.status(200).json({
        result: "0",
        error: "User has already submitted a justification form",
        data: []
      });
    }

  try {
    let evidenceIds = [];
    for (const file of files) {
      const [result] = await db.query(
        `INSERT INTO supporting_evidence (supporting_evidence, created_at) VALUES (?, NOW())`,
        [file.filename]
      );
      evidenceIds.push(result.insertId);
    }

    const evidenceIdsStr = evidenceIds.join(",");

    await db.query(
      `INSERT INTO justify_users (user_id, name, email, reason_appeal, supporting_evidence_id, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, name, email, reason_appeal, evidenceIdsStr]
    );

    return res.status(200).json({
      result: "1",
      message: "Appeal submitted successfully",
      data: { evidenceIds }
    });
  } catch (err) {
    console.error("submit_justify error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};


