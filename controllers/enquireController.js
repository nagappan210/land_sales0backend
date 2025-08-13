const db = require ('../db')

exports.land_categories = async (req, res) => {
  let { page = 1 } = req.body;
  const limit = 10;

  if (!Number.isInteger(Number(page)) || Number(page) < 1) {
    return res.status(400).json({
      result: "0",
      error: "page must be a positive integer",
      data: []
    });
  }
  page = Number(page);
  const offset = (page - 1) * limit;


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
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM land_categories`);
    const totalPages = Math.ceil(total / limit);

    if (rows.length === 0) {
      return res.json({
        success: "0",
        error: "No data in database",
        data: [],
        currentPage: page,
        totalPages,
        totalRecords: total
      });
    }

    res.json({
      success: "1",
      error: "",
      categories: rows,
      currentPage: page,
      totalPages,
      totalRecords: total
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({
      success: "0",
      error: "Server error.",
      data: []
    });
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
    land_type_id,
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
      message: 'Required fields: user_id, recever_posts_id, land_type_id, land_categorie_id, and name.'
    });
  }

  if (phone_num && (!Number.isInteger(Number(phone_num)) || Number(phone_num) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'phone_num must be a positive integer.'
    });
  }
  if (whatsapp_num && (!Number.isInteger(Number(whatsapp_num)) || Number(whatsapp_num) <= 0)) {
    return res.status(400).json({
      success: false,
      message: 'whatsapp_num must be a positive integer.'
    });
  }

  try {
    const [[user]] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (!user) return res.status(404).json({ success: "0", 
      error: 'User not found.',
    data : [] });

    const [[post]] = await db.query(`SELECT * FROM user_posts WHERE user_post_id = ?`, [recever_posts_id]);
    if (!post) return res.status(404).json({ success: "0", 
      error: 'Post not found.',
    data : [] });

    const [[landType]] = await db.query(`SELECT * FROM land_types WHERE land_type_id = ?`, [land_type_id]);
    if (!landType) return res.status(404).json({ success: "0", 
      error: 'Land type not found',
      data : []});

    const [[landCat]] = await db.query(`SELECT * FROM land_categories WHERE land_categorie_id = ?`, [land_categorie_id]);
    if (!landCat) return res.status(404).json({ success: "0", 
      error: 'Land category not found.',
      data : []});

  
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

    // Insert enquiry
    await db.query(
      `INSERT INTO enquiries
        (user_id, recever_posts_id, land_type_id, land_categorie_id, name, phone_number, whatsapp_num, email, land_category_para)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        recever_posts_id,
        land_type_id,
        land_categorie_id,
        name.trim(),
        phone_num || null,
        whatsapp_num || null,
        email || null,
        land_category_para || null
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

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ 
    result: "0",
    error : 'User ID is required and it must be an Integer',
    data : [] });
  }
  const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) 
    {return res.status(404).json({ success: "0", 
    error: 'User not found.',
    data : [] });}

    const [exist_enquire] = await db.query(`SELECT * FROM enquiries WHERE recever_posts_id = ?`, [user_id]);
    if (exist_enquire.length === 0) 
    {return res.status(404).json({ success: "0", 
    error: 'User Enquire is not found.',
    data : [] });}




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
      result: "1",
      count: rows.length,
      data : rows
    });

  } catch (err) {
    console.error('Get received enquiries error:', err);
    return res.status(500).json({ result: "0", 
    error : 'Server error.',
    data : [] });
  }
};

exports.self_enquiry = async (req, res) => {
  const { user_id } = req.body;

  if (!user_id || isNaN(user_id)) {
    return res.status(400).json({ result : "0", error: 'User ID is required and it must be an Integer.' , data : [] });
  }

  const [exist_user] = await db.query(`SELECT * FROM users WHERE U_ID = ?`, [user_id]);
    if (exist_user.length === 0) 
    {return res.status(404).json({ success: "0", 
    error: 'User not found.',
    data : [] });}

    const [exist_enquire] = await db.query(`SELECT * FROM enquiries WHERE user_id = ?`, [user_id]);
    if (exist_enquire.length === 0) 
    {return res.status(404).json({ success: "0", 
    error: 'You Enquiry is not found.',
    data : [] });}


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
      success: "1",
      count: rows.length,
      data : rows
    });

  } catch (err) {
    console.error('Fetch my enquiries error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

exports.declineForm = async (req, res) => {
  try {
    let { page = 1 } = req.body;
    let limit = 10;

    if(isNaN(page)){
      return res.status(400).json({
        result : "0",
        error : "error page is only in Integer",
        data : []
      })
    }

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const offset = (page - 1) * limit;
    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) as total FROM declining_enquire
    `);

    const totalPages = Math.ceil(total / limit);
    if (total === 0) {
      return res.json({
        result: "0",
        error: "No records found",
        data: [],
        current_page: page,
        per_page: limit,
        total_records: total,
        total_pages: totalPages
      });
    }
    if (page > totalPages) {
      return res.json({
        result: "0",
        error: "Page not found",
        data: [],
        current_page: page,
        per_page: limit,
        total_records: total,
        total_pages: totalPages
      });
    }
    const [rows] = await db.query(`
      SELECT declining_enquire_id, name
      FROM declining_enquire
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    return res.json({
      result: "1",
      data: rows,
      current_page: page,
      per_page: limit,
      total_records: total,
      total_pages: totalPages
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
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        result: "0",
        error: "Name is required",
        data: []
      });
    }

    const [rows] = await db.query(
      `SELECT para FROM declining_enquire WHERE name = ?`,
      [name]
    );

    if (!rows.length) {
      return res.json({
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
    console.error("Decline Form Para error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error: " + err.message,
      data: []
    });
  }
};

exports.declineEnquiry = async (req, res) => {
  const { enquire_id, user_posts_id, custom_para } = req.body;

  if (!enquire_id || isNaN(enquire_id)) {
    return res.status(400).json({
      success: false,
      message: "enquire_id is required and it must be an Integer."
    });
  }
  const [exist_user_post] = await db.query(`SELECT * FROM user_posts WHERE user_post_id = ?`, [user_posts_id]);
    if (exist_user_post.length === 0) 
    {return res.status(404).json({ success: "0", 
    error: 'User post is not found.',
    data : [] });}

  try {
    const [check] = await db.query("SELECT enquire_id FROM enquiries WHERE enquire_id = ?",
      [enquire_id]
    );
    if (check.length === 0) {
      return res.status(404).json({
        success: "0",
        error: "Enquiry not found.",
        data : []
      });
    }

    const [alreadyDeclined] = await db.query("SELECT response_id FROM enquiry_responses WHERE enquire_id = ?",
      [enquire_id]
    );
    if (alreadyDeclined.length > 0) {
      return res.status(400).json({
        result: "0",
        error: "You have already declined this enquiry.",
        data : []
      });
    }

    if (user_posts_id) {
      const [postCheck] = await db.query("SELECT user_post_id FROM user_posts WHERE user_post_id = ?",
        [user_posts_id]
      );
      if (postCheck.length === 0) {
        return res.status(404).json({
          result: "0",
          error: "User post not found.",
          data : []
        });
      }
    }

    await db.query(`INSERT INTO enquiry_responses (enquire_id, user_posts_id, custom_para) VALUES (?, ?, ?)`,
      [enquire_id, user_posts_id, custom_para]
    );

    res.json({ result: "1",
       message: "Enquiry declined successfully." });

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
