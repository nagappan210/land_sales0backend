const db = require ('../db')

exports.land_categories = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        lc.land_categorie_id,
        lc.name AS category_name,
        lc.land_type_id,
        lt.name AS land_type_name
      FROM 
        land_categories lc
      JOIN 
        land_types lt ON lc.land_type_id = lt.land_type_id
    `);

    res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.enquire = async (req, res) => {
  const {
    user_id,
    user_posts_id,
    land_categorie_id,
    land_category_name,
    name,
    land_category_para, 
    custom_message,
    whatsapp_num: inputWhatsapp,
    email: inputEmail
  } = req.body;

  if (!user_id || !user_posts_id || !land_categorie_id || !land_category_name || !name) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: user_id, user_posts_id, land_categorie_id, land_category_name, and name.'
    });
  }

  try {
    const [existing] = await db.query(
      `SELECT enquire_id FROM enquiries WHERE user_id = ? AND user_posts_id = ?`,
      [user_id, user_posts_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an enquiry for this post.'
      });
    }

    const [userRows] = await db.query(
      `SELECT phone_num, whatsapp_num, email FROM users WHERE U_ID = ?`,
      [user_id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = userRows[0];
    const phone = user.phone_num;
    const whatsapp = user.whatsapp_num || inputWhatsapp || null;
    const email = user.email || inputEmail || null;

    let finalPara = land_category_para;
    if (!finalPara) {
      const [paraRows] = await db.query(
        `SELECT para FROM land_categories WHERE name = ? LIMIT 1`,
        [land_category_name]
      );
      finalPara = paraRows.length > 0 ? paraRows[0].para : null;
    }

    await db.query(
      `INSERT INTO enquiries
        (user_id, user_posts_id, land_categorie_id, name, phone_number, whatsapp_num, email, land_category_name, land_category_para, custom_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        user_posts_id,
        land_categorie_id,
        name,
        phone,
        whatsapp,
        email,
        land_category_name,
        finalPara,
        custom_message || null
      ]
    );

    return res.json({ success: true, message: 'Enquiry submitted successfully.' });

  } catch (err) {
    console.error('Enquiry error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getEnquiriesReceived = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        e.enquire_id,
        e.user_posts_id,
        e.user_id AS enquiry_by_user_id,
        u.name AS enquiry_by_user_name,
        u.phone_num,
        u.whatsapp_num,
        u.email,
        e.land_category_name,
        e.land_category_para,
        e.custom_message,
        e.created_at,
        up.property_name,
        up.city,
        up.price
      FROM enquiries e
      JOIN user_posts up ON e.user_posts_id = up.user_post_id
      JOIN users u ON e.user_id = u.U_ID
      WHERE up.U_ID = ?
      ORDER BY e.created_at DESC
      `,
      [user_id]
    );

    res.json({
      success: true,
      count: rows.length,
      enquiries: rows
    });

  } catch (err) {
    console.error('Get received enquiries error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.getMyEnquiries = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
  e.enquire_id,
  u.name AS user_name,
  e.user_posts_id,
  up.property_name,
  up.city,
  up.price,
  e.land_category_name,
  e.land_category_para,
  e.custom_message,
  e.created_at
FROM enquiries e
JOIN user_posts up ON e.user_posts_id = up.user_post_id
JOIN users u ON e.user_id = u.U_ID
WHERE e.user_id = ?
ORDER BY e.created_at DESC
`,
      [user_id]
    );

    res.json({
      success: true,
      count: rows.length,
      enquiries: rows
    });

  } catch (err) {
    console.error('Fetch my enquiries error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.declineEnquiry = async (req, res) => {
  const { enquire_id, user_posts_id, declining_enquire_id, custom_para } = req.body;

  if (!enquire_id) {
    return res.status(400).json({
      success: false,
      message: "enquire_id is required."
    });
  }

  try {
    const [check] = await db.query(
      "SELECT enquire_id FROM enquiries WHERE enquire_id = ?",
      [enquire_id]
    );

    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found."
      });
    }

    if (user_posts_id) {
      const [postCheck] = await db.query(
        "SELECT user_post_id FROM user_posts WHERE user_post_id = ?",
        [user_posts_id]
      );

      if (postCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User post not found."
        });
      }
    }

   await db.query(
  `INSERT INTO enquiry_responses (enquire_id, user_posts_id, declining_enquire_id, custom_para)
   VALUES (?, ?, ?, ?)`,
  [enquire_id, user_posts_id, declining_enquire_id || null, custom_para || null]
);

    res.json({ success: true, message: "Enquiry declined successfully." });

  } catch (err) {
    console.error("Decline Enquiry Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getDeclinedEnquiries = async (req, res) => {
  try {
    const { user_id, user_post_id } = req.body;

    let sql = `
      SELECT 
        er.response_id,
        er.enquire_id,
        de.name AS decline_reason,
        COALESCE(er.custom_para, de.para) AS final_para,
        er.created_at,
        u.name AS submitted_by,
        up.property_name,
        up.city,
        up.price,
        up.video
      FROM enquiry_responses er
      JOIN declining_enquire de ON er.declining_enquire_id = de.declining_enquire_id
      JOIN enquiries e ON er.enquire_id = e.enquire_id
      JOIN users u ON e.user_id = u.U_ID
      JOIN user_posts up ON e.user_posts_id = up.user_post_id
      WHERE 1 = 1
    `;

    const values = [];

    if (user_id) {
      sql += ` AND u.U_ID = ?`;
      values.push(user_id);
    }

    if (user_post_id) {
      sql += ` AND up.user_post_id = ?`;
      values.push(user_post_id);
    }

    sql += ` ORDER BY er.created_at DESC`;

    const [rows] = await db.query(sql, values);

    res.json({ success: true, data: rows });

  } catch (err) {
    console.error("Get Declined Enquiries Error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};
