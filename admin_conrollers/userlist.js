const db = require('../db');
require('dotenv').config();

exports.getusertable = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT U_ID, name, profile_image , username, phone_num FROM users where deleted_at is null and otp is null  `
    );
    res.json({ result: "1", error: "", data: rows});
  } catch (err) {
    console.error("Error fetching user table:", err);
    res.status(500).json({ result: "0", error: err.message, data: [] });
  }
};

exports.adduser = async (req, res) => {
    const { name, username, phone_num } = req.body;
    console.log('hit');
    

    if (!name || !username || !phone_num) {
        return res.status(400).json({
            result: "0",
            error: "All fields are required",
            data: []
        });
    }

    try {
        const [row] = await db.query( `INSERT INTO users (name, username, phone_num) VALUES (?, ?, ?)`, [name, username, phone_num] );
        return res.status(200).json({
            result: "1",
            message: "User added successfully",
            data: { id: row.insertId, name, username, phone_num}
        });
    } catch (err) {
        console.error("Error inserting user:", err);
        return res.status(500).json({
            result: "0",
            error: "Server error",
            data: []
        });
    }
};

exports.edituser = async (req, res) => {
  const { user_id, name, phone_num, username } = req.body;
  const profile_image = req.file ? req.file.filename : null;
  
  
  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: [],
    });
  }

  try {
    const fields = [];
    const values = [];
    if (username !== undefined) {
      const [existing] = await db.query(
        `SELECT * FROM users WHERE username = ? AND U_ID != ?`,
        [username,user_id]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          result: "0",
          error: "Username already exists",
          data: [],
        });
      }

      fields.push("username = ?");
      values.push(username);
    }

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }

    if (phone_num !== undefined) {
      fields.push("phone_num = ?");
      values.push(phone_num);
    }

    if (profile_image !== undefined) {
      fields.push("profile_image = ?");
      values.push(profile_image);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        result: "0",
        error: "No fields provided to update",
        data: [],
      });
    }
    fields.push("updated_at = NOW()");
    values.push(user_id);

    const [row] = await db.query(
      `UPDATE users SET ${fields.join(", ")} WHERE U_ID = ?`,
      values
    );

    if (row.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: [],
      });
    }

    return res.json({
      result: "1",
      message: "User updated successfully",
      data: [],
    });
  } catch (err) {
    console.error("Edit user error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error while updating user",
      data: [],
    });
  }
};

exports.deleteuser = async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({
      result: "0",
      error: "user_id is required",
      data: [],
    });
  }

  try {
    const [row] = await db.query(
      `UPDATE users SET deleted_at = NOW() WHERE U_ID = ?`,
      [user_id]
    );

    if (row.affectedRows === 0) {
      return res.status(404).json({
        result: "0",
        error: "User not found or already deleted",
        data: [],
      });
    }

    return res.json({
      result: "1",
      message: "User deleted successfully",
      data: [],
    });
  } catch (err) {
    console.error("Delete user error:", err);
    return res.status(500).json({
      result: "0",
      error: "Server error while deleting user",
      data: [],
    });
  }
};

exports.getuser = async (req, res) => {
  const { user_id } = req.params;
  try {
    const [row] = await db.query(
      `SELECT
      u.U_ID, u.name, u.phone_num_cc, u.phone_num, u.whatsapp_num_cc, u.whatsapp_num, u.email, u.country, u.state, u.cities, u.pincode, u.username, u.bio,
         u.profile_image,
         (SELECT COUNT(*) FROM followers f WHERE f.user_id = u.U_ID) AS follower_count,
         (SELECT COUNT(*) FROM followers f WHERE f.following_id = u.U_ID) AS following_count,
         (SELECT COUNT(*) FROM user_posts p WHERE p.U_ID = u.U_ID AND p.deleted_at IS NULL) AS post_count,
         (SELECT COUNT(*) FROM user_posts p WHERE p.U_ID = u.U_ID AND p.status = draft) AS draft_count
       FROM users u
       WHERE u.U_ID = ?`,
      [user_id]
    );

    if (!row.length) {
      return res.status(404).json({
        result: "0",
        error: "User not found",
        data: []
      });
    }

    return res.status(200).json({
      result: "1",
      message: "The user profile is shown successfully",
      data: row[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.getpost = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT  u.user_post_id,  u.U_ID,  u.user_type,  u.land_type_id,  u.land_categorie_id,  u.video,u.image_ids,  u.status, u.is_sold,
      u.post_type,CASE 
        WHEN u.post_type = 2 THEN i.image_path 
        ELSE NULL 
      END AS images
      FROM user_posts AS u
      LEFT JOIN post_images AS i 
        ON u.user_post_id = i.user_post_id 
        AND u.post_type = 2
      WHERE u.deleted_at IS NULL
      GROUP BY u.user_post_id
    `);

    return res.status(200).json({
      result: "1",
      message: "Posts fetched successfully",
      data: rows
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.enquire_table = async (req,res)=>{
  try{
    const [rows] = await db.query(`
  SELECT  
    e.enquire_id,  
    e.recever_posts_id,  
    e.user_id,  
    e.land_type_id,  
    e.land_categorie_id,  
    e.name AS enquirer_name,  
    e.phone_number,  
    e.whatsapp_num,  
    e.email,  
    e.land_category_para,  
    u.U_ID AS post_user_id,  
    u.user_post_id,  
    u.video,  
    post_owner.name AS post_owner_name,  
    post_owner.U_ID AS post_owner_id
  FROM enquiries AS e
  JOIN user_posts AS u 
    ON u.user_post_id = e.recever_posts_id
  JOIN users AS post_owner
    ON u.U_ID = post_owner.U_ID     
  JOIN users AS enquirer
    ON e.user_id = enquirer.U_ID;   
`);


    if(rows.length === 0){
      return res.status(200).json({
        result : "0",
        error : "No data",
        data : []
      });
    }

    return res.status(200).json({
      result : "1",
      error : "",
      data : rows
    });

  } catch(err){
    console.log(err);
    return res.status(500).json({
      result : "0",
      error : "server error",
      data : []
    });
  }
}

exports.decline_enquire = async (req,res) =>{
  try{
    const [row] = await db.query (`select declining_enquire_id , name , para from  declining_enquire` );
    return res.status(200).json({
      result : "1",
      data : row,
    });
  }
  catch(err){
    console.log(err);
    return res.status(500).json({
      result : "0",
      error : "Server error",
      data : []
    });
    
  }
}

exports.edit_decline_enquire = async (req, res) => {
  const { declining_enquire_id, name, para } = req.body;

  try {
    if (declining_enquire_id) {
      let fields = [];
      let values = [];

      if (name !== undefined) {
        fields.push("name = ?");
        values.push(name);
      }
      if (para !== undefined) {
        fields.push("para = ?");
        values.push(para);
      }

      if (fields.length === 0) {
        return res.status(400).json({ result: "0", error: "Nothing to update" });
      }

      values.push(declining_enquire_id);
      const query = `UPDATE declining_enquire SET ${fields.join(", ")} WHERE declining_enquire_id = ?`;

      const [rows] = await db.query(query, values);
      if (rows.affectedRows > 0) {
        return res.status(200).json({ result: "1", message: "Updated successfully" });
      } else {
        return res.status(404).json({ result: "0", error: "Record not found" });
      }
    } else {
      const [row] = await db.query(
        "INSERT INTO declining_enquire (name, para, create_at) VALUES (?, ?, NOW())",
        [name, para]
      );

      if (row.affectedRows > 0) {
        return res.status(200).json({
          result: "1",
          message: "Inserted successfully",
          id: row.insertId,
        });
      } else {
        return res.status(400).json({ result: "0", error: "Insert failed" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ result: "0", error: "Internal server error" });
  }
};


exports.delete_decline_enquire = async (req,res) =>{
  const {declining_enquire_id} = req.body;

  try{
    const [row] = await db.query(`delete from declining_enquire where declining_enquire_id = ?` , [declining_enquire_id])
    if(row.affectedRows === 0){
      return res.status(200).json({
        result : "0",
        error : "Db not updated",
        data : []
      });
    }
    return res.status(200).json({
      result : '1',
      message : " Delata sucessfully"
    });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({ result: "0", error: "Internal server error" });
  }
}