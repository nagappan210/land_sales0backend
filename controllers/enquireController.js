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

exports.land_categories_para = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      result: "0",
      error: "name is required",
      data: []
    });
  }

  try {
    const [rows] = await db.query(`SELECT para FROM land_categories WHERE name = ?`, [name]);

    if (rows.length === 0) {
      return res.status(404).json({
        result: "0",
        error: "No category found with that name",
        data: []
      });
    }

    return res.json({
      result: "1",
      data: rows[0].para
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: "Internal Server Error",
      data: []
    });
  }
};

exports.enquire = async (req, res) => {
  const {
    user_id,
    recever_posts_id,
    land_type_id , 
    land_categorie_id,
    name,
    phone_num,
    whatsapp_num,
    email,
    land_category_para
  } = req.body;

  if (!user_id || !recever_posts_id || !land_categorie_id || !name || !land_type_id) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: user_id, recever_posts_id, land_categorie_id, and name.'
    });
  }

  try {
    const [existing] = await db.query(
      `SELECT enquire_id FROM enquiries WHERE user_id = ? AND recever_posts_id = ?`,
      [user_id, recever_posts_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an enquiry for this post.'
      });
    }

    await db.query(
      `INSERT INTO enquiries
        (user_id, recever_posts_id,land_type_id, land_categorie_id, name, phone_number, whatsapp_num, email, land_category_para)
       VALUES (?, ?, ?, ?, ?, ?, ?, ? ,?)`,
      [
        user_id,
        recever_posts_id,
        land_categorie_id,
        land_type_id,
        name.trim(),
        phone_num,
        whatsapp_num || null,
        email || null,
        land_category_para
      ]
    );

    return res.json({ success: true, message: 'Enquiry submitted successfully.' });

  } catch (err) {
    console.error('Enquiry error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.my_leads = async (req, res) => {
  const user_id = req.body.user_id || req.query.user_id;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  console.log("Fetching leads for user_id:", user_id);

  try {
    const [rows] = await db.query(
      `
      SELECT 
        e.enquire_id,
        e.recever_posts_id,
        e.user_id AS enquiry_by_user_id,
        u.name AS enquiry_by_user_name,
        u.phone_num AS enquiry_by_user_phone,
        u.whatsapp_num AS enquiry_by_user_whatsapp,
        u.email AS enquiry_by_user_email,
        e.land_category_para,
        e.created_at,
        up.property_name,
        up.city,
        up.price
      FROM enquiries e
      JOIN user_posts up ON e.recever_posts_id = up.user_post_id
      JOIN users u ON e.user_id = u.U_ID
      WHERE up.U_ID = ?
      ORDER BY e.created_at DESC
      `,
      [user_id]
    );

    console.log(`Found ${rows.length} leads for user_id ${user_id}`);

    return res.json({
      success: true,
      count: rows.length,
      enquiries: rows
    });

  } catch (err) {
    console.error('Get received enquiries error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.self_enquiry = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    const [rows] = await db.query(
      `
      SELECT 
        e.enquire_id,
        u.name AS user_name,
        e.recever_posts_id,
        up.property_name,
        up.city,
        up.price,
        e.land_type_id,
        e.land_categorie_id,
        e.land_category_para,
        e.created_at
      FROM enquiries e
      JOIN user_posts up ON e.recever_posts_id = up.user_post_id
      JOIN users u ON e.user_id = u.U_ID
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
      `,
      [user_id]
    );

    return res.json({
      success: true,
      count: rows.length,
      enquiries: rows
    });

  } catch (err) {
    console.error('Fetch my enquiries error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.declineForm = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT declining_enquire_id, name 
      FROM declining_enquire
    `);

    return res.json({
      result: "1",
      data: rows
    });

  } catch (err) {
    console.error("Decline Form error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.declineFormpara = async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({
      result: "0",
      error: "Name is required",
      data: []
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT para FROM declining_enquire WHERE name = ?`,
      [name]
    );

    if (!rows.length) {
      return res.status(404).json({
        result: "0",
        error: "No matching record found",
        data: []
      });
    }

    return res.json({
      result: "1",
      data: rows
    });

  } catch (err) {
    console.error("Decline Form error:", err);
    return res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
};

exports.declineEnquiry = async (req, res) => {
  const { enquire_id, user_posts_id, custom_para } = req.body;

  if (!enquire_id) {
    return res.status(400).json({
      success: false,
      message: "enquire_id is required."
    });
  }

  try {
    const [check] = await db.query("SELECT enquire_id FROM enquiries WHERE enquire_id = ?",
      [enquire_id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found."
      });
    }

    const [alreadyDeclined] = await db.query("SELECT response_id FROM enquiry_responses WHERE enquire_id = ?",
      [enquire_id]
    );
    if (alreadyDeclined.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already declined this enquiry."
      });
    }

    if (user_posts_id) {
      const [postCheck] = await db.query("SELECT user_post_id FROM user_posts WHERE user_post_id = ?",
        [user_posts_id]
      );
      if (postCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User post not found."
        });
      }
    }

    await db.query(`INSERT INTO enquiry_responses (enquire_id, user_posts_id, custom_para) VALUES (?, ?, ?)`,
      [enquire_id, user_posts_id, custom_para]
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
        er.custom_para AS final_para,
        er.created_at,
        u.name AS submitted_by,
        up.property_name,
        up.city,
        up.price,
        up.video
      FROM enquiry_responses er
      JOIN enquiries e ON er.enquire_id = e.enquire_id
      JOIN users u ON e.user_id = u.U_ID
      JOIN user_posts up ON e.recever_posts_id = up.user_post_id
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
