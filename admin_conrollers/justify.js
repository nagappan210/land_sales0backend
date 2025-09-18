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
      `INSERT INTO justify_users (user_id, name, email, reason_appeal, supporting_evidence_id,justify_status, created_at)
       VALUES (?, ?, ?, ?, ?,1, NOW())`,
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

exports.post_justify = async (req, res) => {
  const { user_id, user_post_id } = req.body;

  if (!user_id || !user_post_id) {
    return res.status(200).json({
      result: "0",
      error: "All fields are required",
      data: []
    });
  }

  try {
    const [check] = await db.query(
      `SELECT u.U_ID, u.username, u.name,u.profile_image, u.email, up.account_status , up.user_post_id , up.U_ID ,up.user_post_id, up.video , up.thumbnail , up.property_name , up.country , up.state ,up.city , up.locality from users as u join user_posts as up  on up.U_ID = u.U_ID
      WHERE up.U_ID = ? AND up.user_post_id = ?`,
      [user_id, user_post_id]
    );

    if (check.length === 0) {
      return res.status(200).json({
        result: "0",
        error: "User post not found",
        data: []
      });
    }

    const user = check[0];

    if (user.account_status === 0) {
      return res.status(200).json({
        result: "0",
        error: "The user post is not banned",
        data: []
      });
    }

    const [reports] = await db.query(
      `SELECT r.report_sentence_id, rs.report_sentence, COUNT(*) AS times_reported
       FROM report r
       JOIN report_sentence rs ON r.report_sentence_id = rs.report_sentence_id
       WHERE r.receiver_id = ? AND r.status = 2
       GROUP BY r.report_sentence_id
       ORDER BY times_reported DESC limit 1`,
      [user.U_ID]
    );

    const [reportCount] = await db.query(
      `SELECT COUNT(*) AS total_reports 
       FROM report 
       WHERE receiver_id = ? AND status = 2`,
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
      message: "User post is banned, please justify",
      data: {
        user_details: {
          user_id: user.U_ID,
          user_post_id : user.user_post_id,
          username: user.username,
          profile_image : user.profile_image,
          name: user.name,
          email: user.email,
          video: user.video,
          thumbnail : user.thumbnail,
          property_name : user.property_name,
          address: [user.locality, user.city, user.state, user.country]
                    .filter(v => v && v.trim() !== "")
                    .join(", "),
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

exports.submit_post_justify = async (req, res) => {
  const { user_id,user_post_id, name, email, reason_appeal } = req.body;

  console.log('user_post_id' , user_post_id);
  
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
    `INSERT INTO justify_users 
    (user_id, user_post_id, name, email, reason_appeal, supporting_evidence_id, justify_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 2, NOW())`,
    [user_id, user_post_id, name, email, reason_appeal, evidenceIdsStr]
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

exports.getjustify_user = async (req, res) => {
  const { user_id } = req.body;
  try {
    const [rows] = await db.query(
      `SELECT 
        u.U_ID,
        u.name,
        u.phone_num_cc,
        u.phone_num,
        u.whatsapp_num_cc,
        u.whatsapp_num,
        u.email,
        u.country,
        u.state,
        u.cities,
        u.pincode,
        u.username,
        u.profile_image,
        j.reason_appeal,
        j.supporting_evidence_id,
        (select r1.report_sentence from report r1 where r1.receiver_id = u.u_id group by r1.report_sentence order by count(*) DESC limit 1) as report_sentence,
        GROUP_CONCAT(s.supporting_evidence) AS supporting_evidence,
        (SELECT COUNT(*) FROM followers f WHERE f.user_id = u.U_ID) AS follower_count,
        (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.U_ID) AS following_count,
        (SELECT COUNT(*) FROM user_posts p WHERE p.U_ID = u.U_ID AND p.deleted_at IS NULL) AS post_count
      FROM users u
      LEFT JOIN justify_users j ON j.user_id = u.U_ID
      LEFT JOIN supporting_evidence s 
        ON FIND_IN_SET(s.supporting_evidence_id, j.supporting_evidence_id)
      WHERE u.U_ID = ? AND j.justify_status = 1 and u.account_status = 1 and u.U_ID = j.user_id
      GROUP BY u.U_ID, j.reason_appeal, j.supporting_evidence_id`,
      [user_id]
    );

    if (!rows.length) {
      return res.status(404).json({
        result: "0",
        message: "No data found",
        data: []
      });
    }

    const row = rows[0];

    const response = {
      ...row,
      supporting_evidence_id: row.supporting_evidence_id
        ? row.supporting_evidence_id.split(",")
        : [],
      supporting_evidence: row.supporting_evidence
        ? row.supporting_evidence.split(",").map(
            (file) => `${process.env.SERVER_ADDRESS}uploaded/evidence/${file}`
          )
        : [],
    };


    return res.status(200).json({
      result: "1",
      data: response
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

exports.getjustify_user_post = async (req, res) => {
  const { user_id, user_post_id } = req.body;
  try {
    const [rows] = await db.query(`SELECT  u.U_ID, u.name, u.phone_num_cc, u.phone_num, u.whatsapp_num_cc, u.whatsapp_num, u.email, u.country, u.state, u.cities, u.pincode, u.username, u.profile_image, up.user_post_id, up.video, up.thumbnail,
      j.reason_appeal,
      j.supporting_evidence_id,

      ( SELECT r1.report_sentence FROM report r1 WHERE r1.user_post_id = up.user_post_id GROUP BY r1.report_sentence ORDER BY COUNT(*) DESC LIMIT 1 ) AS report_sentence,

      GROUP_CONCAT(s.supporting_evidence) AS supporting_evidence,

      (SELECT COUNT(*) FROM followers f WHERE f.user_id = u.U_ID) AS follower_count,
      (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.U_ID) AS following_count,
      (SELECT COUNT(*) FROM user_posts p WHERE p.U_ID = u.U_ID AND p.deleted_at IS NULL) AS post_count

  FROM users u
  JOIN user_posts up 
    ON up.user_post_id = ? 
   AND up.U_ID = u.U_ID
  LEFT JOIN justify_users j 
    ON j.user_id = u.U_ID 
   AND j.user_post_id = up.user_post_id
   AND j.justify_status = 2
  LEFT JOIN supporting_evidence s 
    ON FIND_IN_SET(s.supporting_evidence_id, j.supporting_evidence_id)

  WHERE u.U_ID = ? and up.account_status = 1 and up.user_post_id = j.user_post_id
  GROUP BY u.U_ID, up.user_post_id, up.video, up.thumbnail, j.reason_appeal, j.supporting_evidence_id`,
  [user_post_id, user_id]);


    if (!rows.length) {
      return res.status(404).json({
        result: "0",
        message: "No data found",
        data: []
      });
    }

    const row = rows[0];

    const response = {
      ...row,
      supporting_evidence_id: row.supporting_evidence_id
        ? row.supporting_evidence_id.split(",")
        : [],
      supporting_evidence: row.supporting_evidence
        ? row.supporting_evidence.split(",")
        : [],
    };

    return res.status(200).json({
      result: "1",
      data: response
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

