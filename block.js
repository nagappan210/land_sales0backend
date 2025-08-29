import mysql from "mysql2/promise";
import { faker } from "@faker-js/faker";

async function block() {
    const db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "land_sales",
    });

    try {
        const start = 1;
        const end = 400;

        for (let i = 0; i < 50; i++) {
            let blocker_id = faker.number.int({ min: start, max: end });
            let user_id;
            do {
                user_id = 5
            } while (user_id === blocker_id);

            await db.query(
                `INSERT INTO blocks (user_id, blocker_id) VALUES (?, ?)`,
                [user_id, blocker_id]
            );
        }

        console.log("50 block records inserted");
    } catch (err) {
        console.error("Error inserting blocks:", err);
    } finally {
        await db.end();
    }
}

block();
