import mysql from "mysql2/promise";
import { faker } from "@faker-js/faker";

async function seedReels() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "land_sales",
  });

  try {
    const reels = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    ];

    const userTypes = [0, 1];
    const landTypes = [1, 2, 3];
    const landCategories = Array.from({ length: 18 }, (_, i) => i + 1);

    const startId = 1;
    const endId = 400;

    for (let i = 0; i < 300; i++) {
      const U_ID = faker.number.int({ min: startId, max: endId });
      const user_type = faker.helpers.arrayElement(userTypes);
      const land_type_id = faker.helpers.arrayElement(landTypes);
      const land_categorie_id = faker.helpers.arrayElement(landCategories);
      const video = faker.helpers.arrayElement(reels);

      const country = faker.location.country();
      const state = faker.location.state();
      const city = faker.location.city();
      const locality = faker.location.streetAddress();
      const latitude = faker.location.latitude();
      const longitude = faker.location.longitude();

      await db.query(
        `INSERT INTO user_posts 
          (U_ID, user_type, land_type_id, land_categorie_id, video, status, post_type,
           country, state, city, locality, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ U_ID, user_type, land_type_id, land_categorie_id, video, "published", 1, country, state, city, locality, latitude, longitude,
        ]
      );
    }

    console.log("300 fake reels with location inserted into user_posts!");
  } catch (err) {
    console.error("Error inserting reels:", err);
  } finally {
    db.end();
  }
}

seedReels();
