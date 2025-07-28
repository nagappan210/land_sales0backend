const db = require('../db');

exports.setUserInterest = (req,res)=>{
  const{ U_ID , interest_id } = req.body;

  if (!U_ID) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  if(!interest_id) {
    db.query(`DELETE FROM user_interests WHERE U_ID = ?` , [U_ID] , (err)=>{
      if (err) return res.status(500).json({ error: err.message });
      return res.json({ message: 'Interest skipped successfully' });
    });
  }
  else{
    db.query(`select * from interests where interest_id = ?`, [interest_id] , (err,result)=>{
        
        
      if (err) return res.status(500).json({ error: err.message });

      if (result.length === 0) {
        return res.status(400).json({ message: 'Invalid interest selected' });
      }

      db.query(`delete from user_interests where U_ID=? `,[U_ID],(err2)=>{
        if (err2) return res.status(500).json({ error: err2.message });

        db.query(`insert into user_interests (U_ID , interest_id) values(?,?)`,[U_ID , interest_id],(err3)=>{
          if (err3) return res.status(500).json({ error: err3.message });

          return res.json({ message: 'Interest saved successfully' });
        });
      });
    });
  }
}

exports.getUserInterest = (req,res)=>{
  const { U_ID } = req.params;

  db.query(` select i.interest_id , i.name from user_interests ui 
    join interests i ON ui.interest_id = i.interest_id
    WHERE ui.U_ID = ? `,
  [U_ID],
    (err, result) =>{
      if (err) return res.status(500).json({ error: err.message });

      if (result.length === 0) {
        return res.json({ interest: null });
      }

      res.json({ interest: result[0] });
    })
}