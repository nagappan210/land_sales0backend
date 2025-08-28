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
