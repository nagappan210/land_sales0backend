const db = require ('../db')

exports.land_categories = async (req, res) => {
  let { page = 1 } = req.body;
  const limit = 30;

  if (!Number.isInteger(Number(page)) || Number(page) < 1) {
    return res.status(200).json({
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
        result : "0",
        error: "No data in database",
        data: [],
        currentPage: page,
        totalPages,
        totalRecords: total
      });
    }

    res.json({
      result : "1",
      error: "",
      categories: rows,
      currentPage: page,
      totalPages,
      totalRecords: total
    });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({
      result : "0",
      error: "Server error.",
      data: []
    });
  }
};

exports.land_categories_para = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(200).json({
      result: "0",
      error: "name is required",
      data: []
    });
  }

  try {
    const [rows] = await db.query(`SELECT para FROM land_categories WHERE name = ?`, [name]);

    if (rows.length === 0) {
      return res.status(200).json({
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
  const { user_id, recever_posts_id, land_type_id, land_categorie_id, name, phone_num, whatsapp_num, email, land_category_para } = req.body;

  if (!user_id || !recever_posts_id || !land_type_id || !land_categorie_id || !name?.trim()) {
    return res.status(200).json({
      result: "0",
      error: "Required fields: user_id, recever_posts_id, land_type_id, land_categorie_id, and name.",
      data: []
    });
  }

  // if (phone_num && (!Number.isInteger(Number(phone_num)) || Number(phone_num) <= 0)) {
  //   return res.status(200).json({
  //     result: "0",
  //     error: "phone_num must be a positive integer.",
  //     data: []
  //   });
  // }

  // if (whatsapp_num && (!Number.isInteger(Number(whatsapp_num)) || Number(whatsapp_num) <= 0)) {
  //   return res.status(200).json({
  //     result: "0",
  //     error: "whatsapp_num must be a positive integer.",
  //     data: []
  //   });
  // }

  try {
    // User check
    const [[user]] = await db.query(`SELECT U_ID FROM users WHERE U_ID = ?`, [user_id]);
    if (!user) {
      return res.status(200).json({
        result: "0",
        error: "User not found.",
        data: []
      });
    }

    // Post check
    const [[post]] = await db.query(
      `SELECT user_post_id, U_ID FROM user_posts WHERE user_post_id = ?`,
      [recever_posts_id]
    );
    if (!post) {
      return res.status(200).json({
        result: "0",
        error: "Post not found.",
        data: []
      });
    }

    //  Block check (either user blocked the other)
    const [[blockCheck]] = await db.query(
      `SELECT block_id FROM blocks 
       WHERE (blocker_id = ? AND user_id = ?) 
          OR (blocker_id = ? AND user_id = ?) 
       LIMIT 1`,
      [user_id, post.U_ID, post.U_ID, user_id]
    );
    if (blockCheck) {
      return res.status(200).json({
        result: "0",
        error: "You cannot send enquiry because one of you has blocked the other.",
        data: []
      });
    }

    // Land type check
    const [[landType]] = await db.query(`SELECT land_type_id FROM land_types WHERE land_type_id = ?`, [land_type_id]);
    if (!landType) {
      return res.status(200).json({
        result: "0",
        error: "Land type not found.",
        data: []
      });
    }

    // Land category check
    const [[landCat]] = await db.query(`SELECT land_categorie_id FROM land_categories WHERE land_categorie_id = ?`, [land_categorie_id]);
    if (!landCat) {
      return res.status(200).json({
        result: "0",
        error: "Land category not found.",
        data: []
      });
    }

    // Duplicate enquiry check
    const [existing] = await db.query(
      `SELECT enquire_id FROM enquiries WHERE user_id = ? AND recever_posts_id = ?`,
      [user_id, recever_posts_id]
    );
    if (existing.length > 0) {
      return res.status(200).json({
        result: "0",
        error: "You have already submitted an enquiry for this post.",
        data: []
      });
    }

    // Insert enquiry
    await db.query(
      `INSERT INTO enquiries
        (user_id, recever_posts_id, land_type_id, land_categorie_id, name, phone_number, whatsapp_num, email, land_category_para)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ user_id, recever_posts_id, land_type_id, land_categorie_id, name.trim(), phone_num || null, whatsapp_num || null, email?.trim() || null, land_category_para?.trim() || null ] );

    return res.status(200).json({
      result: "1",
      message: "Enquiry submitted successfully."
    });

  } catch (err) {
    console.error("Enquiry error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error.",
      data: []
    });
  }
};

exports.my_leads = async (req, res) => {
  let { user_id, page = 1, limit = 10 } = req.body;

  if (!user_id || isNaN(user_id)) {
    return res.status(200).json({
      result: "0",
      error: "User ID is required and it must be an Integer",
      data: []
    });
  }

  const [exist_user] = await db.query(
    `SELECT * FROM users WHERE U_ID = ? AND deleted_at IS NULL`,
    [user_id]
  );
  if (exist_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found.",
      data: []
    });
  }

  const [exist_enquire] = await db.query(
    `SELECT 1 
     FROM enquiries e 
     JOIN user_posts up ON e.recever_posts_id = up.user_post_id 
     WHERE up.U_ID = ? 
     LIMIT 1`,
    [user_id]
  );
  if (exist_enquire.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User Enquire is not found.",
      data: []
    });
  }

  try {
    const offset = (page - 1) * limit;

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM enquiries e 
       JOIN user_posts up ON e.recever_posts_id = up.user_post_id 
       WHERE up.U_ID = ?`,
      [user_id]
    );
    const total = countResult[0].total;

    const [rows] = await db.query(
      `
      SELECT 
        e.enquire_id,
        e.recever_posts_id,
        e.user_id AS enquiry_by_user_id,

        u.U_ID AS enquiry_user_id,
        u.name AS enquiry_by_name,
        u.username AS enquiry_by_username,
        u.profile_image AS enquiry_by_profile_image,
        u.country AS enquiry_by_country,
        u.state AS enquiry_by_state,
        u.cities AS enquiry_by_cities,
        u.pincode AS enquiry_by_pincode,
        u.phone_num_cc AS enquiry_by_phone_cc,
        u.phone_num AS enquiry_by_phone,
        u.whatsapp_num_cc AS enquiry_by_whatsapp_cc,
        u.whatsapp_num AS enquiry_by_whatsapp,
        u.email AS enquiry_by_email,
        u.latitude AS enquiry_by_latitude,
        u.longitude AS enquiry_by_longitude,

        pu.U_ID AS post_user_id,
        pu.name AS post_user_name,
        pu.username AS post_user_username,
        pu.profile_image AS post_user_profile_image,
        pu.country AS post_user_country,
        pu.state AS post_user_state,
        pu.cities AS post_user_cities,
        pu.pincode AS post_user_pincode,
        pu.phone_num_cc AS post_user_phone_cc,
        pu.phone_num AS post_user_phone,
        pu.whatsapp_num_cc AS post_user_whatsapp_cc,
        pu.whatsapp_num AS post_user_whatsapp,
        pu.email AS post_user_email,
        pu.latitude AS post_user_latitude,
        pu.longitude AS post_user_longitude,

        up.thumbnail,
        up.video,

        COALESCE(pl.total_likes, 0) AS total_likes,
        COALESCE(pc.total_comments, 0) AS total_comments,
        CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked,
        CASE WHEN sp.U_ID IS NOT NULL THEN 1 ELSE 0 END AS is_saved,
        1 AS enquiry,
        CASE WHEN er.enquire_id IS NOT NULL THEN 1 ELSE 0 END AS declain,


        e.land_category_para,
        e.created_at,

        up.*
      FROM enquiries e
      JOIN user_posts up 
          ON e.recever_posts_id = up.user_post_id
      JOIN users u 
          ON e.user_id = u.U_ID
      JOIN users pu 
          ON up.U_ID = pu.U_ID

      LEFT JOIN enquiry_responses er 
          ON er.enquire_id = e.enquire_id

      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_likes
          FROM post_likes
          GROUP BY user_post_id
      ) AS pl ON pl.user_post_id = up.user_post_id

      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_comments
          FROM post_comments
          WHERE deleted_at IS NULL
          GROUP BY user_post_id
      ) AS pc ON pc.user_post_id = up.user_post_id

      LEFT JOIN post_likes ul
          ON ul.user_post_id = up.user_post_id AND ul.user_id = ?

      LEFT JOIN saved_properties sp
          ON sp.user_post_id = up.user_post_id AND sp.U_ID = ?

      LEFT JOIN (
          SELECT user_post_id
          FROM report
          WHERE user_id = ? AND status = 2
      ) AS is_report 
          ON is_report.user_post_id = up.user_post_id

      WHERE up.U_ID = ?
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [user_id, user_id, user_id, user_id, Number(limit), Number(offset)]
    );

    const normalizedData = rows.map(row => {
      const cleanObj = {};
      for (let key in row) {
        cleanObj[key] = row[key] == null ? "" : row[key];
      }

      let imageUrls = [];
      if (cleanObj.images) {
        try {
          imageUrls = JSON.parse(cleanObj.images).map(img =>
            `${process.env.SERVER_ADDRESS}${img}`
          );
        } catch {
          imageUrls = [];
        }
      }

      const enquiry_user_address = [
        cleanObj.enquiry_by_cities,
        cleanObj.enquiry_by_state,
        cleanObj.enquiry_by_country,
        cleanObj.enquiry_by_pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      const post_user_address = [
        cleanObj.post_user_cities,
        cleanObj.post_user_state,
        cleanObj.post_user_country,
        cleanObj.post_user_pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      const post_address = [
        cleanObj.locality,
        cleanObj.city,
        cleanObj.state,
        cleanObj.country,
        cleanObj.pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      let landTypeText = "";
      if (cleanObj.land_type_id === 1) landTypeText = "Residential";
      if (cleanObj.land_type_id === 2) landTypeText = "Commercial";
      if (cleanObj.land_type_id === 3) landTypeText = "Agriculture";

      const categories = {
        1: "Flat/ Apartment",
        2: "Villa/Independent House",
        3: "Builder Floor Apartment",
        4: "Land/ Plot",
        5: "Studio Apartment",
        6: "Other",
        7: "Commercial Office Space",
        8: "Office in IT Park",
        9: "Commercial Shop",
        10: "Commercial Showroom",
        11: "Commercial Land",
        12: "Warehouse/ Godown",
        13: "Industrial Land",
        14: "Industrial Building",
        15: "Industrial Shed",
        16: "Other",
        17: "Farmhouse",
        18: "Agricultural Land"
      };
      const landCategoryText = categories[cleanObj.land_categorie_id] || "";

      return {
        enquiry_details: {
          enquire_id: cleanObj.enquire_id,
          enquiry_by_user_id: cleanObj.enquiry_by_user_id,
          enquiry_by_username: cleanObj.enquiry_by_username,
          enquiry_by_name: cleanObj.enquiry_by_name,
          enquiry_by_profile_image: cleanObj.enquiry_by_profile_image,
          enquiry_by_user_phone: cleanObj.enquiry_by_phone,
          enquiry_by_user_whatsapp: cleanObj.enquiry_by_whatsapp,
          enquiry_by_user_email: cleanObj.enquiry_by_email,
          land_category_para: cleanObj.land_category_para,
          country: cleanObj.enquiry_by_country,
          state: cleanObj.enquiry_by_state,
          cities: cleanObj.enquiry_by_cities,
          pincode: cleanObj.enquiry_by_pincode,
          address: enquiry_user_address,
          created_at: cleanObj.created_at,
          is_declain: cleanObj.declain,
        },
        post_user: {
          user_id: cleanObj.post_user_id,
          user_post_id: cleanObj.user_post_id,
          username: cleanObj.post_user_username,
          name: cleanObj.post_user_name,
          profile_image: cleanObj.post_user_profile_image,
          phone_num_cc: cleanObj.post_user_phone_cc,
          phone: cleanObj.post_user_phone,
          whatsapp_num_cc: cleanObj.post_user_whatsapp_cc,
          whatsapp: cleanObj.post_user_whatsapp,
          email: cleanObj.post_user_email,
          country: cleanObj.post_user_country,
          state: cleanObj.post_user_state,
          cities: cleanObj.post_user_cities,
          pincode: cleanObj.post_user_pincode,
          thumbnail: cleanObj.thumbnail? `${process.env.SERVER_ADDRESS}${cleanObj.thumbnail}`: "",
          video: cleanObj.video,
          total_likes: cleanObj.total_likes,
          total_comments: cleanObj.total_comments,
          is_liked: cleanObj.is_liked,
          is_saved: cleanObj.is_saved,
          enquiry: 0,
          address: post_user_address,
        },
        post_property: {
          user_post_id: cleanObj.user_post_id,
          user_type: cleanObj.user_type,
          land_type_id: cleanObj.land_type_id,
          landTypeText,
          land_categorie_id: cleanObj.land_categorie_id,
          landCategoryText,
          country: cleanObj.country,
          state: cleanObj.state,
          city: cleanObj.city,
          locality: cleanObj.locality,
          latitude: cleanObj.latitude,
          longitude: cleanObj.longitude,
          created_at: cleanObj.created_at,
          property_name: cleanObj.property_name,
          bhk_type: cleanObj.bhk_type,
          carpet_area: cleanObj.carpet_area,
          property_area: cleanObj.property_area,
          built_up_area: cleanObj.built_up_area,
          super_built_up_area: cleanObj.super_built_up_area,
          facade_width: cleanObj.facade_width,
          facade_height: cleanObj.facade_height,
          area_length: cleanObj.area_length,
          area_width: cleanObj.area_width,
          property_facing: cleanObj.property_facing,
          total_floor: cleanObj.total_floor,
          property_floor_no: cleanObj.property_floor_no,
          property_ownership: cleanObj.property_ownership,
          availability_status: cleanObj.availability_status,
          no_of_bedrooms: cleanObj.no_of_bedrooms,
          no_of_bathrooms: cleanObj.no_of_bathrooms,
          no_of_balconies: cleanObj.no_of_balconies,
          no_of_open_sides: cleanObj.no_of_open_sides,
          no_of_cabins: cleanObj.no_of_cabins,
          no_of_meeting_rooms: cleanObj.no_of_meeting_rooms,
          min_of_seats: cleanObj.min_of_seats,
          max_of_seats: cleanObj.max_of_seats,
          conference_room: cleanObj.conference_room,
          no_of_staircases: cleanObj.no_of_staircases,
          washroom_details: cleanObj.washroom_details,
          reception_area: cleanObj.reception_area,
          pantry: cleanObj.pantry,
          pantry_size: cleanObj.pantry_size,
          central_ac: cleanObj.central_ac,
          oxygen_duct: cleanObj.oxygen_duct,
          ups: cleanObj.ups,
          other_rooms: cleanObj.other_rooms,
          furnishing_status: cleanObj.furnishing_status,
          fire_safety_measures: cleanObj.fire_safety_measures,
          lifts: cleanObj.lifts,
          is_it_pre_leased_pre_rented	: cleanObj.	is_it_pre_leased_pre_rented,
          which_local_authority: cleanObj.which_local_authority,
          does_local_authority : cleanObj.does_local_authority,
          noc_certified: cleanObj.noc_certified,
          occupancy_certificate: cleanObj.occupancy_certificate,
          office_previously_used_for: cleanObj.office_previously_used_for,
          parking_available: cleanObj.parking_available,
          boundary_wall: cleanObj.boundary_wall,
          amenities: cleanObj.amenities,
          suitable_business_type: cleanObj.suitable_business_type,
          price: cleanObj.price,
          price_negotiable: cleanObj.price_negotiable,
          property_highlights: cleanObj.property_highlights,
          video: imageUrls.length > 0 ? "" : cleanObj.video,
          image_urls: imageUrls,
          thumbnail: cleanObj.thumbnail
            ? `${process.env.SERVER_ADDRESS}${cleanObj.thumbnail}`
            : (imageUrls.length > 0 ? imageUrls[0] : ""),
          address: post_address,
          is_report: 0,
        }
      };
    });

    return res.json({
      result: "1",
      data: normalizedData,
      totalPages: Math.ceil(total / limit),
      nxtpage: page < Math.ceil(total / limit) ? Number(page) + 1 : 0,
      recCnt: normalizedData.length
    });

  } catch (err) {
    console.error("Get received enquiries error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error.",
      data: []
    });
  }
};


exports.self_enquiry = async (req, res) => {
  let { user_id, page = 1, limit = 10 } = req.body;

  if (!user_id || isNaN(user_id)) {
    return res.status(200).json({
      result: "0",
      error: "User ID is required and it must be an Integer.",
      data: []
    });
  }

  const [exist_user] = await db.query(
    `SELECT * FROM users WHERE U_ID = ? AND deleted_at IS NULL`,
    [user_id]
  );
  if (exist_user.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "User not found.",
      data: []
    });
  }

  const [exist_enquire] = await db.query(
    `SELECT 1 FROM enquiries WHERE user_id = ? LIMIT 1`,
    [user_id]
  );
  if (exist_enquire.length === 0) {
    return res.status(200).json({
      result: "0",
      error: "You Enquiry is not found.",
      data: []
    });
  }

  try {
    const offset = (page - 1) * limit;

    const [countResult] = await db.query(
      `SELECT COUNT(*) AS total FROM enquiries WHERE user_id = ?`,
      [user_id]
    );
    const total = countResult[0].total;

    const [rows] = await db.query(
      `
      SELECT 
        e.enquire_id,
        e.recever_posts_id,
        u.U_ID AS enquiry_by_user_id,
        u.name AS enquiry_by_name,
        u.username AS enquiry_by_username,
        u.profile_image AS enquiry_by_profile_image,
        u.country AS user_country,
        u.state AS user_state,
        u.cities AS user_cities,
        u.pincode AS user_pincode,
        u.phone_num AS enquiry_by_user_phone,
        u.whatsapp_num AS enquiry_by_user_whatsapp,
        u.email AS enquiry_by_user_email,

        pu.U_ID AS post_user_id,
        pu.name AS post_user_name,
        pu.username AS post_user_username,
        pu.profile_image AS post_user_profile_image,
        pu.country AS post_user_country,
        pu.state AS post_user_state,
        pu.cities AS post_user_cities,
        pu.pincode AS post_user_pincode,
        pu.phone_num_cc AS post_user_phone_cc,
        pu.phone_num AS post_user_phone,
        pu.whatsapp_num_cc AS post_user_whatsapp_cc,
        pu.whatsapp_num AS post_user_whatsapp,
        pu.email AS post_user_email,
        pu.latitude AS post_user_latitude,
        pu.longitude AS post_user_longitude,

        up.thumbnail,
        up.video,

        COALESCE(pl.total_likes, 0) AS total_likes,
        COALESCE(pc.total_comments, 0) AS total_comments,
        CASE WHEN ul.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_liked,
        CASE WHEN sp.U_ID IS NOT NULL THEN 1 ELSE 0 END AS is_saved,
        1 AS enquiry,
        CASE WHEN er.enquire_id IS NOT NULL THEN 1 ELSE 0 END AS declain,
        CASE WHEN is_report.user_post_id IS NOT NULL THEN 1 ELSE 0 END AS is_reported,

        e.land_type_id,
        e.land_categorie_id,
        e.land_category_para,
        e.created_at,
        up.*
      FROM enquiries e
      JOIN user_posts up ON e.recever_posts_id = up.user_post_id
      JOIN users u ON e.user_id = u.U_ID
      JOIN users pu ON up.U_ID = pu.U_ID

      LEFT JOIN enquiry_responses er 
        ON er.enquire_id = e.enquire_id

      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_likes
          FROM post_likes
          GROUP BY user_post_id
      ) AS pl ON pl.user_post_id = up.user_post_id

      LEFT JOIN (
          SELECT user_post_id, COUNT(*) AS total_comments
          FROM post_comments
          WHERE deleted_at IS NULL
          GROUP BY user_post_id
      ) AS pc ON pc.user_post_id = up.user_post_id

      LEFT JOIN post_likes ul
          ON ul.user_post_id = up.user_post_id AND ul.user_id = ?

      LEFT JOIN saved_properties sp
          ON sp.user_post_id = up.user_post_id AND sp.U_ID = ?

      LEFT JOIN (
          SELECT user_post_id
          FROM report
          WHERE user_id = ? AND status = 2
      ) AS is_report 
          ON is_report.user_post_id = up.user_post_id

      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [user_id, user_id, user_id, user_id, Number(limit), Number(offset)]
    );

    const normalizedData = rows.map(row => {
      const cleanObj = {};
      for (let key in row) {
        cleanObj[key] = row[key] == null ? "" : row[key];
      }

      let imageUrls = [];
      if (cleanObj.images) {
        try {
          imageUrls = JSON.parse(cleanObj.images).map(img =>
            `${process.env.SERVER_ADDRESS}${img}`
          );
        } catch {
          imageUrls = [];
        }
      }

      const enquiry_user_address = [
        cleanObj.user_cities,
        cleanObj.user_state,
        cleanObj.user_country,
        cleanObj.user_pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      const post_user_address = [
        cleanObj.post_user_cities,
        cleanObj.post_user_state,
        cleanObj.post_user_country,
        cleanObj.post_user_pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      const post_address = [
        cleanObj.locality,
        cleanObj.city,
        cleanObj.state,
        cleanObj.country,
        cleanObj.pincode,
      ].filter(v => v && v.toString().trim() !== "").join(", ");

      let landTypeText = "";
      if (cleanObj.land_type_id === 1) landTypeText = "Residential";
      if (cleanObj.land_type_id === 2) landTypeText = "Commercial";
      if (cleanObj.land_type_id === 3) landTypeText = "Agriculture";

      const categories = {
        1: "Flat/ Apartment",
        2: "Villa/Independent House",
        3: "Builder Floor Apartment",
        4: "Land/ Plot",
        5: "Studio Apartment",
        6: "Other",
        7: "Commercial Office Space",
        8: "Office in IT Park",
        9: "Commercial Shop",
        10: "Commercial Showroom",
        11: "Commercial Land",
        12: "Warehouse/ Godown",
        13: "Industrial Land",
        14: "Industrial Building",
        15: "Industrial Shed",
        16: "Other",
        17: "Farmhouse",
        18: "Agricultural Land"
      };
      let landCategoryText = categories[cleanObj.land_categorie_id] || "";

      return {
        enquiry_details: {
          enquire_id: cleanObj.enquire_id,
          enquiry_by_user_id: cleanObj.enquiry_by_user_id,
          enquiry_by_username: cleanObj.enquiry_by_username,
          enquiry_by_name: cleanObj.enquiry_by_name,
          enquiry_by_profile_image: cleanObj.enquiry_by_profile_image,
          enquiry_by_user_phone: cleanObj.enquiry_by_user_phone,
          enquiry_by_user_whatsapp: cleanObj.enquiry_by_user_whatsapp,
          enquiry_by_user_email: cleanObj.enquiry_by_user_email,
          land_category_para: cleanObj.land_category_para,
          country: cleanObj.user_country,
          state: cleanObj.user_state,
          cities: cleanObj.user_cities,
          pincode: cleanObj.user_pincode,
          address: enquiry_user_address,
          created_at: cleanObj.created_at,
          is_declain: cleanObj.declain,
        },
        post_user: {
          user_id: cleanObj.post_user_id,
          user_post_id: cleanObj.user_post_id,
          username: cleanObj.post_user_username,
          name: cleanObj.post_user_name,
          profile_image: cleanObj.post_user_profile_image,
          phone_num_cc: cleanObj.post_user_phone_cc,
          phone: cleanObj.post_user_phone,
          whatsapp_num_cc: cleanObj.post_user_whatsapp_cc,
          whatsapp: cleanObj.post_user_whatsapp,
          email: cleanObj.post_user_email,
          country: cleanObj.post_user_country,
          state: cleanObj.post_user_state,
          cities: cleanObj.post_user_cities,
          pincode: cleanObj.post_user_pincode,
          thumbnail: cleanObj.thumbnail
            ? `${process.env.SERVER_ADDRESS}${cleanObj.thumbnail}`
            : "",
          video: cleanObj.video,
          total_likes: cleanObj.total_likes,
          total_comments: cleanObj.total_comments,
          is_liked: cleanObj.is_liked,
          is_saved: cleanObj.is_saved,
          enquiry: 0,
          address: post_user_address,
        },
        post_property: {
          user_post_id: cleanObj.user_post_id,
          user_type: cleanObj.user_type,
          land_type_id: cleanObj.land_type_id,
          landTypeText,
          land_categorie_id: cleanObj.land_categorie_id,
          landCategoryText,
          country: cleanObj.country,
          state: cleanObj.state,
          city: cleanObj.city,
          locality: cleanObj.locality,
          latitude: cleanObj.latitude,
          longitude: cleanObj.longitude,
          created_at: cleanObj.created_at,
          property_name: cleanObj.property_name,
          bhk_type: cleanObj.bhk_type,
          carpet_area: cleanObj.carpet_area,
          property_area: cleanObj.property_area,
          built_up_area: cleanObj.built_up_area,
          super_built_up_area: cleanObj.super_built_up_area,
          facade_width: cleanObj.facade_width,
          facade_height: cleanObj.facade_height,
          area_length: cleanObj.area_length,
          area_width: cleanObj.area_width,
          property_facing: cleanObj.property_facing,
          total_floor: cleanObj.total_floor,
          property_floor_no: cleanObj.property_floor_no,
          property_ownership: cleanObj.property_ownership,
          availability_status: cleanObj.availability_status,
          no_of_bedrooms: cleanObj.no_of_bedrooms,
          no_of_bathrooms: cleanObj.no_of_bathrooms,
          no_of_balconies: cleanObj.no_of_balconies,
          no_of_open_sides: cleanObj.no_of_open_sides,
          no_of_cabins: cleanObj.no_of_cabins,
          no_of_meeting_rooms: cleanObj.no_of_meeting_rooms,
          min_of_seats: cleanObj.min_of_seats,
          max_of_seats: cleanObj.max_of_seats,
          conference_room: cleanObj.conference_room,
          no_of_staircases: cleanObj.no_of_staircases,
          washroom_details: cleanObj.washroom_details,
          reception_area: cleanObj.reception_area,
          pantry: cleanObj.pantry,
          pantry_size: cleanObj.pantry_size,
          central_ac: cleanObj.central_ac,
          oxygen_duct: cleanObj.oxygen_duct,
          ups: cleanObj.ups,
          other_rooms: cleanObj.other_rooms,
          furnishing_status: cleanObj.furnishing_status,
          fire_safety_measures: cleanObj.fire_safety_measures,
          lifts: cleanObj.lifts,
          is_it_pre_leased_pre_rented: cleanObj.is_it_pre_leased_pre_rented,
          which_local_authority: cleanObj.which_local_authority,
          does_local_authority: cleanObj.does_local_authority,
          noc_certified: cleanObj.noc_certified,
          occupancy_certificate: cleanObj.occupancy_certificate,
          office_previously_used_for: cleanObj.office_previously_used_for,
          parking_available: cleanObj.parking_available,
          boundary_wall: cleanObj.boundary_wall,
          amenities: cleanObj.amenities,
          suitable_business_type: cleanObj.suitable_business_type,
          price: cleanObj.price,
          price_negotiable: cleanObj.price_negotiable,
          property_highlights: cleanObj.property_highlights,
          video: imageUrls.length > 0 ? "" : cleanObj.video,
          image_urls: imageUrls,
          thumbnail: cleanObj.thumbnail
            ? `${process.env.SERVER_ADDRESS}${cleanObj.thumbnail}`
            : (imageUrls.length > 0 ? imageUrls[0] : ""),
          address: post_address,
          is_report: cleanObj.is_reported,
          
        }
      };
    });

    return res.json({
      result: "1",
      error: "",
      data: normalizedData,
      totalPages: Math.ceil(total / limit),
      nxtpage: page < Math.ceil(total / limit) ? Number(page) + 1 : 0,
      recCnt: normalizedData.length
    });

  } catch (err) {
    console.error("Fetch self enquiries error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error.",
      data: []
    });
  }
};



exports.declineEnquiry = async (req, res) => {
  const { enquire_id, user_posts_id, custom_para } = req.body;

  if (!enquire_id || isNaN(enquire_id)) {
    return res.status(200).json({
      result : "0",
      error : "enquire_id is required and it must be an Integer.",
      data : []
    });
  }
  const [exist_user_post] = await db.query(`SELECT * FROM user_posts WHERE user_post_id = ?`, [user_posts_id]);
    if (exist_user_post.length === 0) 
    {return res.status(200).json({ result : "0", 
    error: 'User post is not found.',
    data : [] });}

  try {
    const [check] = await db.query("SELECT enquire_id FROM enquiries WHERE enquire_id = ?",
      [enquire_id]
    );
    if (check.length === 0) {
      return res.status(200).json({
        result : "0",
        error: "Enquiry not found.",
        data : []
      });
    }

    const [alreadyDeclined] = await db.query("SELECT response_id FROM enquiry_responses WHERE enquire_id = ?",
      [enquire_id]
    );
    if (alreadyDeclined.length > 0) {
      return res.status(200).json({
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
        return res.status(200).json({
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
    res.status(500).json({ result : "0", error : "Server error." , data : []});
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

    res.json({ result : "1", data: rows });

  } catch (err) {
    console.error("Get Declined Enquiries Error:", err);
    res.status(500).json({ result: "0", error: "Server error.", data : [] });
  }
};
