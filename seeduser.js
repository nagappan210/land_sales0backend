import mysql from "mysql2/promise";
import { faker } from "@faker-js/faker";

async function seedUsers() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "land_sales",
  });

  try {
    for (let i = 0; i < 400; i++) {
      const name = faker.person?.fullName ? faker.person.fullName() : faker.name.findName();
      const email = faker.internet.email();
      const phone = faker.phone.number();
      const username =
        faker.internet?.userName?.() ||
        (name.replace(/\s+/g, "").toLowerCase() + faker.number.int({ min: 100, max: 999 }));

      const country = faker.location?.country ? faker.location.country() : faker.address.country();
      const state = faker.location?.state ? faker.location.state() : faker.address.state();
      const city = faker.location?.city ? faker.location.city() : faker.address.city();
      const pincode = faker.location?.zipCode ? faker.location.zipCode() : faker.address.zipCode();
      const latitude = faker.location?.latitude ? faker.location.latitude() : faker.address.latitude();
      const longitude = faker.location?.longitude ? faker.location.longitude() : faker.address.longitude();

      await db.query(
        `INSERT INTO users 
          (name, email, phone_num, username, country, state, cities, pincode, latitude, longitude) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, username, country, state, city, pincode, latitude, longitude]
      );
    }

    console.log("✅ 400 fake users inserted successfully!");
  } catch (err) {
    console.error("❌ Error inserting users:", err);
  } finally {
    db.end();
  }
}

seedUsers();
