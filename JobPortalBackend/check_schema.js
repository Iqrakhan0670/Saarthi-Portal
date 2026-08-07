import dotenv from 'dotenv';
dotenv.config();
import db from './config/database.js';

async function main() {
  try {
    const [tables] = await db.query("SHOW TABLES");
    console.log("=== Database Tables ===");
    console.log(JSON.stringify(tables, null, 2));

    for (const row of tables) {
      const tableName = Object.values(row)[0];
      console.log(`\n=== Table: ${tableName} ===`);
      const [columns] = await db.query(`DESCRIBE \`${tableName}\``);
      console.table(columns);
    }
    
    // Also check if scheduled_interviews exists
    try {
      const [siDesc] = await db.query("DESCRIBE `scheduled_interviews`");
      console.log("\nscheduled_interviews table description:");
      console.table(siDesc);
    } catch (e) {
      console.log("\nscheduled_interviews table does NOT exist or error:", e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error("Failed to fetch schema:", err);
    process.exit(1);
  }
}

main();
