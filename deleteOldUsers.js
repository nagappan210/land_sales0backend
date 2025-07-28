const db = require('./db');

const query = `
  DELETE FROM users 
  WHERE deleted_at IS NOT NULL 
    AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
`;

db.query(query, (err, result) => {
  if (err) {
    console.error('Permanent delete error:', err.message);
  } else {
    console.log(`${result.affectedRows} users permanently deleted.`);
  }

  db.end();
});
