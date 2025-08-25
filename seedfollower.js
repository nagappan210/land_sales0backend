import mysql from "mysql2/promise";
import { faker } from "@faker-js/faker";

async function seedFollows() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "land_sales",
  });

  try {
  
    const startId = 1;
    const endId = 400;

    for (let i = 0; i < 200; i++) {
      const userId = faker.number.int({ min: startId, max: endId });
      let followingId;

      do {
        followingId = 1
      } while (followingId === userId);

      await db.query(
        `INSERT INTO followers (user_id, following_id) VALUES (?, ?)`,
        [userId, followingId]
      );
    }

    console.log("✅ 200 fake follow records inserted (IDs 800–900 range)!");
  } catch (err) {
    console.error("❌ Error inserting follows:", err);
  } finally {
    db.end();
  }
}

seedFollows();
