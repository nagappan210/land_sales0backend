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
    const { land_categorie_id } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!land_categorie_id) {
      return res.status(200).json({ message: 'land_categorie_id is required.' });
    }

    if (!image) {
      return res.status(200).json({ message: 'Image file is required.' });
    }

    await db.query(
      `UPDATE land_categories SET image = ? WHERE land_categorie_id = ?`,
      [image, land_categorie_id]
    );

    res.json({ message: 'Image updated successfully.', filename: image });
  } catch (err) {
    console.error('Error updating image:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.get_land_categorie = async (req, res) => {
  try {

    const baseImageUrl ="uploaded/land_categoies/";

    const [results] = await db.query(`
      SELECT land_categorie_id, land_type_id, name, image , para
      FROM land_categories `);

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

