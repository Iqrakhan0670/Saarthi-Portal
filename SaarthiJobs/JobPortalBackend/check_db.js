import 'dotenv/config';
import db from './config/database.js';

try {
  const [columns] = await db.query("SHOW COLUMNS FROM user_profiles");
  console.log("Columns of user_profiles:", columns.map(c => `${c.Field} (${c.Type})`));
  process.exit(0);
} catch (err) {
  console.error("Database query failed:", err);
  process.exit(1);
}
