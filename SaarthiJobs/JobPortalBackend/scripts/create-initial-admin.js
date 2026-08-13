// Script to create initial admin user
import dotenv from 'dotenv';
dotenv.config();

import db from '../config/database.js';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_NAME = 'Root Admin';

async function createInitialAdmin() {
  try {
    console.log('🔵 Checking if admin exists...');
    
    const [existing] = await db.query('SELECT id FROM admins WHERE email = ?', [ADMIN_EMAIL]);
    
    if (existing.length > 0) {
      console.log('✅ Admin already exists with email:', ADMIN_EMAIL);
      process.exit(0);
    }
    
    console.log('🔵 Creating initial admin...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    await db.query(
      'INSERT INTO admins (email, password, name, can_create_admins, can_revoke_admins) VALUES (?, ?, ?, ?, ?)',
      [ADMIN_EMAIL, hashedPassword, ADMIN_NAME, 1, 1]
    );
    
    console.log('✅ Initial admin created successfully!');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Name:', ADMIN_NAME);
    console.log('\n🔐 Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createInitialAdmin();
