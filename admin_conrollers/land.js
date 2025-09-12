const db = require('../db');
require('dotenv').config();

exports.landtype = async(req,res)=>{
    try{
        const [row] = await db.query(`select land_type_id , name from land_types`)
        return res.status(200).json({
            result : "1",
            data : row
        });
    }
    catch(err){
        console.log(err);
        return res.status(500).json({
            result : "0",
            error : "server error",
            data : []
        });
        
    }
}

exports.addlandtypes = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({
      result: "0",
      error: "name is required",
      data: []
    });
  }

  try {
    const [row] = await db.query(
      `INSERT INTO land_types (name) VALUES (?)`,
      [name]
    );

    return res.status(200).json({
      result: "1",
      message: "Land type added successfully",
      data: { id: row.insertId, name }
    });
  } catch (err) {
    console.error("Add Land Type Error:", err);
    return res.status(500).json({
      result: "0",
      error: "server error",
      data: []
    });
  }
};

exports.add_land_category = async (req, res) => {
  try {
    const { land_categorie_id, land_type_id, name, para } = req.body;
    const image = req.file ? req.file.filename : null;

    if (land_categorie_id) {
      let update = [];
      let values = [];

      if (name) {
        update.push("name = ?");
        values.push(name);
      }
      if (para) {
        update.push("para = ?");
        values.push(para);
      }
      if (land_type_id) {
        update.push("land_type_id = ?");
        values.push(land_type_id);
      }
      if (image) {
        update.push("image = ?");
        values.push(image);
      }

      if (update.length === 0) {
        return res.status(400).json({
          result: "0",
          error: "No fields to update",
          data: []
        });
      }

      values.push(land_categorie_id);
      await db.query(
        `UPDATE land_categories SET ${update.join(", ")} WHERE land_categorie_id = ?`,
        values
      );

      return res.status(200).json({
        result: "1",
        message: "Land category updated successfully",
        data: { land_categorie_id, name, para, land_type_id, image }
      });
    } else {
      if (!land_type_id || !name || !para || !image) {
        return res.status(400).json({
          result: "0",
          error: "All fields are required",
          data: []
        });
      }

      const [row] = await db.query(
        `INSERT INTO land_categories (land_type_id, name, para, image) VALUES (?, ?, ?, ?)`,
        [land_type_id, name, para, image]
      );

      return res.status(200).json({
        result: "1",
        message: "Land category added successfully",
        data: { land_categorie_id: row.insertId, land_type_id, name, para, image }
      });
    }
  } catch (err) {
    console.error("Error in add_land_category:", err);
    res.status(500).json({
      result: "0",
      error: "Server error",
      data: []
    });
  }
};

exports.get_land_categorie = async (req, res) => {
  try {

    const baseImageUrl ="uploaded/land_categoies/";

    const [results] = await db.query(`
      SELECT land_categorie_id, land_type_id, name, image , para
      FROM land_categories where delete_at is null`);

    const normalized = results.map(r => ({
      land_categorie_id: r.land_categorie_id ?? 0,
      land_type_id: r.land_type_id ?? 0,
      name: r.name ?? "",
      para : r.para,
      image: r.image ? baseImageUrl + r.image : ""
    }));

    res.json({
      result: "1",
      error: "",
      data: normalized
    });

  } catch (err) {
    console.error('Error fetching land interests:', err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: [],
      totalPages: 0,
      nxtpage: 0,
      recCnt: 0
    });
  }
};

exports.delete_land_categoies = async (req,res)=>{
  const {	land_categorie_id } = req.body
  try{
    const [delete_land_categoies] = await db.query(`update land_categories set delete_at = now() where land_categorie_id  = ?`, [	land_categorie_id ])

    if(delete_land_categoies.affectedRows === 0){
      return res.status(200).json({
        result : "0",
        error : "Database is not updated",
        data : []
      });
    }
    return res.status(200).json({
      result: "1",
      message: "Category deleted successfully",
      data: []
    });
  }
  catch (err) {
    console.error('Error fetching land interests:', err);
    res.status(500).json({
      result: "0",
      error: err.message,
      data: []
    });
  }
}

exports.getbhk_type = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bhk_type_id, bhk_type FROM bhk_type`
    );

    return res.status(200).json({
      result: "1",
      data: rows,
    });
  } catch (err) {
    console.error("Error fetching bhk types:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to fetch BHK types",
      data: [],
    });
  }
};

exports.addbhk_type = async (req, res) => {
  const { bhk_type, status, bhk_type_id } = req.body;

  try {
    if (status === 1) {
      await db.query(`INSERT INTO bhk_type (bhk_type) VALUES (?)`, [bhk_type]);
      return res.status(200).json({
        result: "1",
        message: "BHK type added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE bhk_type SET bhk_type = ? WHERE bhk_type_id = ?`,
        [bhk_type, bhk_type_id]
      );
      return res.status(200).json({
        result: "1",
        message: "BHK type updated successfully",
      });
    }

    if (status === 3) {
      await db.query(`DELETE FROM bhk_type WHERE bhk_type_id = ?`, [bhk_type_id]);
      return res.status(200).json({
        result: "1",
        message: "BHK type deleted successfully",
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete",
    });

  } catch (err) {
    console.error("Error in addbhk_type:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process BHK type",
    });
  }
};

exports.property_facing = async (req, res) => {
  let { property_facing, status, property_facing_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO property_facing (property_facing) VALUES (?)`,
        [property_facing]
      );
      return res.status(200).json({
        result: "1",
        message: "Property facing type added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE property_facing SET property_facing = ? WHERE property_facing_id = ?`,
        [property_facing, property_facing_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Property facing type updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM property_facing WHERE property_facing_id = ?`,
        [property_facing_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Property facing type deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT property_facing_id, property_facing FROM property_facing`
      );
      return res.status(200).json({
        result: "1",
        message: "Property facing fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in property_facing:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process property_facing type",
    });
  }
};

exports.property_ownership = async (req, res) => {
  let { property_ownership, status, property_ownership_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO property_ownership (property_ownership) VALUES (?)`,
        [property_ownership]
      );
      return res.status(200).json({
        result: "1",
        message: "property_ownership added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE property_ownership SET property_ownership = ? WHERE property_ownership_id = ?`,
        [property_ownership, property_ownership_id]
      );
      return res.status(200).json({
        result: "1",
        message: "property_ownership updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM property_ownership WHERE property_ownership_id = ?`,
        [property_ownership_id]
      );
      return res.status(200).json({
        result: "1",
        message: "property_ownership deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT property_ownership_id, property_ownership FROM property_ownership`
      );
      return res.status(200).json({
        result: "1",
        message: "property_ownership fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in property_ownership:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process property_ownership type",
    });
  }
};

exports.availability_status = async (req, res) => {
  let { availability_status, status, availability_status_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO availability_status (availability_status) VALUES (?)`,
        [availability_status]
      );
      return res.status(200).json({
        result: "1",
        message: "availability_status added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE availability_status SET availability_status = ? WHERE availability_status_id = ?`,
        [availability_status, availability_status_id]
      );
      return res.status(200).json({
        result: "1",
        message: "availability_status updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM availability_status WHERE availability_status_id = ?`,
        [availability_status_id]
      );
      return res.status(200).json({
        result: "1",
        message: "availability_status deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT availability_status_id, availability_status FROM availability_status`
      );
      return res.status(200).json({
        result: "1",
        message: "availability_status fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in availability_status:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process availability_status type",
    });
  }
};

exports.other_rooms = async (req, res) => {
  let { other_rooms, status, other_rooms_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO other_rooms (other_rooms) VALUES (?)`,
        [other_rooms]
      );
      return res.status(200).json({
        result: "1",
        message: "other_rooms added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE other_rooms SET other_rooms = ? WHERE other_rooms_id = ?`,
        [other_rooms, other_rooms_id]
      );
      return res.status(200).json({
        result: "1",
        message: "other_rooms updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM other_rooms WHERE other_rooms_id = ?`,
        [other_rooms_id]
      );
      return res.status(200).json({
        result: "1",
        message: "other_rooms deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT other_rooms_id, other_rooms FROM other_rooms`
      );
      return res.status(200).json({
        result: "1",
        message: "other_rooms fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in other_rooms:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process other_rooms type",
    });
  }
};

exports.furnishing_status = async (req, res) => {
  let { furnishing_status, status, furnishing_status_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO furnishing_status (furnishing_status) VALUES (?)`,
        [furnishing_status]
      );
      return res.status(200).json({
        result: "1",
        message: "furnishing_status added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE furnishing_status SET furnishing_status = ? WHERE furnishing_status_id = ?`,
        [furnishing_status, furnishing_status_id]
      );
      return res.status(200).json({
        result: "1",
        message: "furnishing_status updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM furnishing_status WHERE furnishing_status_id = ?`,
        [furnishing_status_id]
      );
      return res.status(200).json({
        result: "1",
        message: "furnishing_status deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT furnishing_status_id, furnishing_status FROM furnishing_status`
      );
      return res.status(200).json({
        result: "1",
        message: "furnishing_status fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in furnishing_status:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process furnishing_status type",
    });
  }
};

exports.amenities = async (req, res) => {
  let { amenities, status, amenities_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO amenities (amenities) VALUES (?)`,
        [amenities]
      );
      return res.status(200).json({
        result: "1",
        message: "Amenities added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE amenities SET amenities = ? WHERE amenities_id = ?`,
        [amenities, amenities_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Amenities updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM amenities WHERE amenities_id = ?`,
        [amenities_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Amenities deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT amenities_id, amenities FROM amenities`
      );
      return res.status(200).json({
        result: "1",
        message: "Amenities fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in amenities:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process amenities",
    });
  }
};

exports.property_highlights = async (req, res) => {
  let { property_highlight, status, property_highlight_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO property_highlights (property_highlights) VALUES (?)`,
        [property_highlight]
      );
      return res.status(200).json({
        result: "1",
        message: "Property highlight added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE property_highlights SET property_highlights = ? WHERE property_highlights_id = ?`,
        [property_highlight, property_highlight_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Property highlight updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM property_highlights WHERE property_highlights_id = ?`,
        [property_highlight_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Property highlight deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT property_highlights_id, property_highlights FROM property_highlights`
      );
      return res.status(200).json({
        result: "1",
        message: "Property highlights fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in property_highlights:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process property_highlights",
    });
  }
};

exports.reception_area = async (req, res) => {
  let { reception_area, status, reception_area_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO reception_area (reception_area) VALUES (?)`,
        [reception_area]
      );
      return res.status(200).json({
        result: "1",
        message: "Reception area added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE reception_area SET reception_area = ? WHERE reception_area_id = ?`,
        [reception_area, reception_area_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Reception area updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM reception_area WHERE reception_area_id = ?`,
        [reception_area_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Reception area deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT reception_area_id, reception_area FROM reception_area`
      );
      return res.status(200).json({
        result: "1",
        message: "Reception areas fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in reception_area:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process reception_area",
    });
  }
};

exports.oxygen_duct = async (req, res) => {
  let { oxygen_duct, status, oxygen_duct_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO oxygen_duct (oxygen_duct) VALUES (?)`,
        [oxygen_duct]
      );
      return res.status(200).json({
        result: "1",
        message: "Oxygen duct added successfully",
      });
    }

    if (status === 2) {
      await db.query(
        `UPDATE oxygen_duct SET oxygen_duct = ? WHERE oxygen_duct_id = ?`,
        [oxygen_duct, oxygen_duct_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Oxygen duct updated successfully",
      });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM oxygen_duct WHERE oxygen_duct_id = ?`,
        [oxygen_duct_id]
      );
      return res.status(200).json({
        result: "1",
        message: "Oxygen duct deleted successfully",
      });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT oxygen_duct_id, oxygen_duct FROM oxygen_duct`
      );
      return res.status(200).json({
        result: "1",
        message: "Oxygen ducts fetched successfully",
        data: rows,
      });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in oxygen_duct:", err);
    return res.status(500).json({
      result: "0",
      error: "Failed to process oxygen_duct",
    });
  }
};

exports.lifts = async (req, res) => {
  let { lifts, status, lifts_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(`INSERT INTO lifts (lifts) VALUES (?)`, [lifts]);
      return res.status(200).json({ result: "1", message: "Lift added successfully" });
    }

    if (status === 2) {
      await db.query(`UPDATE lifts SET lifts = ? WHERE lifts_id = ?`, [lifts, lifts_id]);
      return res.status(200).json({ result: "1", message: "Lift updated successfully" });
    }

    if (status === 3) {
      await db.query(`DELETE FROM lifts WHERE lifts_id = ?`, [lifts_id]);
      return res.status(200).json({ result: "1", message: "Lift deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(`SELECT lifts_id, lifts FROM lifts`);
      return res.status(200).json({ result: "1", message: "Lifts fetched successfully", data: rows });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in lifts:", err);
    return res.status(500).json({ result: "0", error: "Failed to process lifts" });
  }
};

exports.ups = async (req, res) => {
  let { ups, status, ups_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(`INSERT INTO ups (ups) VALUES (?)`, [ups]);
      return res.status(200).json({ result: "1", message: "UPS added successfully" });
    }

    if (status === 2) {
      await db.query(`UPDATE ups SET ups = ? WHERE ups_id = ?`, [ups, ups_id]);
      return res.status(200).json({ result: "1", message: "UPS updated successfully" });
    }

    if (status === 3) {
      await db.query(`DELETE FROM ups WHERE ups_id = ?`, [ups_id]);
      return res.status(200).json({ result: "1", message: "UPS deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(`SELECT ups_id, ups FROM ups`);
      return res.status(200).json({ result: "1", message: "UPS fetched successfully", data: rows });
    }

    return res.status(400).json({
      result: "0",
      error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All",
    });
  } catch (err) {
    console.error("Error in ups:", err);
    return res.status(500).json({ result: "0", error: "Failed to process UPS" });
  }
};

exports.office_previously_used_for = async (req, res) => {
  let { office_previously_used_for, status, office_previously_used_for_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO office_previously_used_for (office_previously_used_for) VALUES (?)`,
        [office_previously_used_for]
      );
      return res.status(200).json({ result: "1", message: "Office previously used for added successfully" });
    }

    if (status === 2) {
      await db.query(
        `UPDATE office_previously_used_for SET office_previously_used_for = ? WHERE office_previously_used_for_id = ?`,
        [office_previously_used_for, office_previously_used_for_id]
      );
      return res.status(200).json({ result: "1", message: "Office previously used for updated successfully" });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM office_previously_used_for WHERE office_previously_used_for_id = ?`,
        [office_previously_used_for_id]
      );
      return res.status(200).json({ result: "1", message: "Office previously used for deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT office_previously_used_for_id, office_previously_used_for FROM office_previously_used_for`
      );
      return res.status(200).json({ result: "1", message: "Office previously used for fetched successfully", data: rows });
    }

    return res.status(400).json({ result: "0", error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All" });
  } catch (err) {
    console.error("Error in office_previously_used_for:", err);
    return res.status(500).json({ result: "0", error: "Failed to process office_previously_used_for" });
  }
};

exports.fire_safety_measures = async (req, res) => {
  let { fire_safety_measures, status, fire_safety_measures_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO fire_safety_measures (fire_safety_measures) VALUES (?)`,
        [fire_safety_measures]
      );
      return res.status(200).json({ result: "1", message: "Fire safety measure added successfully" });
    }

    if (status === 2) {
      await db.query(
        `UPDATE fire_safety_measures SET fire_safety_measures = ? WHERE fire_safety_measures_id = ?`,
        [fire_safety_measures, fire_safety_measures_id]
      );
      return res.status(200).json({ result: "1", message: "Fire safety measure updated successfully" });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM fire_safety_measures WHERE fire_safety_measures_id = ?`,
        [fire_safety_measures_id]
      );
      return res.status(200).json({ result: "1", message: "Fire safety measure deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT fire_safety_measures_id, fire_safety_measures FROM fire_safety_measures`
      );
      return res.status(200).json({ result: "1", message: "Fire safety measures fetched successfully", data: rows });
    }

    return res.status(400).json({ result: "0", error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All" });
  } catch (err) {
    console.error("Error in fire_safety_measures:", err);
    return res.status(500).json({ result: "0", error: "Failed to process fire_safety_measures" });
  }
};

exports.washroom_details = async (req, res) => {
  let { washroom_details, status, washroom_details_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO washroom_details (washroom_details) VALUES (?)`,
        [washroom_details]
      );
      return res.status(200).json({ result: "1", message: "Washroom detail added successfully" });
    }

    if (status === 2) {
      await db.query(
        `UPDATE washroom_details SET washroom_details = ? WHERE washroom_details_id = ?`,
        [washroom_details, washroom_details_id]
      );
      return res.status(200).json({ result: "1", message: "Washroom detail updated successfully" });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM washroom_details WHERE washroom_details_id = ?`,
        [washroom_details_id]
      );
      return res.status(200).json({ result: "1", message: "Washroom detail deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT washroom_details_id, washroom_details FROM washroom_details`
      );
      return res.status(200).json({ result: "1", message: "Washroom details fetched successfully", data: rows });
    }

    return res.status(400).json({ result: "0", error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All" });
  } catch (err) {
    console.error("Error in washroom_details:", err);
    return res.status(500).json({ result: "0", error: "Failed to process washroom_details" });
  }
};

exports.suitable_business_type = async (req, res) => {
  let { suitable_business_type, status, suitable_business_type_id } = req.body;

  try {
    status = Number(status);

    if (status === 1) {
      await db.query(
        `INSERT INTO suitable_business_type (suitable_business_type) VALUES (?)`,
        [suitable_business_type]
      );
      return res.status(200).json({ result: "1", message: "Suitable business type added successfully" });
    }

    if (status === 2) {
      await db.query(
        `UPDATE suitable_business_type SET suitable_business_type = ? WHERE suitable_business_type_id = ?`,
        [suitable_business_type, suitable_business_type_id]
      );
      return res.status(200).json({ result: "1", message: "Suitable business type updated successfully" });
    }

    if (status === 3) {
      await db.query(
        `DELETE FROM suitable_business_type WHERE suitable_business_type_id = ?`,
        [suitable_business_type_id]
      );
      return res.status(200).json({ result: "1", message: "Suitable business type deleted successfully" });
    }

    if (status === 4) {
      const [rows] = await db.query(
        `SELECT suitable_business_type_id, suitable_business_type FROM suitable_business_type`
      );
      return res.status(200).json({ result: "1", message: "Suitable business types fetched successfully", data: rows });
    }

    return res.status(400).json({ result: "0", error: "Invalid status value. Use 1=Add, 2=Update, 3=Delete, 4=Get All" });
  } catch (err) {
    console.error("Error in suitable_business_type:", err);
    return res.status(500).json({ result: "0", error: "Failed to process suitable_business_type" });
  }
};
