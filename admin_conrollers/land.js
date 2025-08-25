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
