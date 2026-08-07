import mysql from 'mysql2/promise';
import { getEnv } from '../utils/envLoader.js';

let db = null;
let dbInitError = null;

// SQL to create password_reset_tokens table if it doesn't exist
const CREATE_PASSWORD_RESET_TOKENS_TABLE = `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_email (email),
        INDEX idx_expires_at (expires_at),
        INDEX idx_user_id (user_id)
    )
`;

// SQL to create otp_store table if it doesn't exist
const CREATE_OTP_STORE_TABLE = `
    CREATE TABLE IF NOT EXISTS otp_store (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_email (email),
        INDEX idx_expires_at (expires_at)
    )
`;

// SQL to create admins table if it doesn't exist
const CREATE_ADMINS_TABLE = `
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        can_create_admins BOOLEAN DEFAULT FALSE,
        can_revoke_admins BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        deleted_at DATETIME,
        deleted_by INT,
        INDEX idx_email (email),
        INDEX idx_deleted_at (deleted_at)
    )
`;

// SQL to add employer approval columns to users table if they don't exist
const ADD_EMPLOYER_APPROVAL_COLUMNS = async (pool) => {
    // First check which columns already exist
    const [columns] = await pool.query('SHOW COLUMNS FROM users');
    const existingColumns = columns.map(c => c.Field.toLowerCase());

    const columnsToAdd = [
        { name: 'is_approved', sql: 'ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT TRUE' },
        { name: 'approval_status', sql: `ALTER TABLE users ADD COLUMN approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved'` },
        { name: 'approval_notes', sql: 'ALTER TABLE users ADD COLUMN approval_notes TEXT' },
        { name: 'approved_at', sql: 'ALTER TABLE users ADD COLUMN approved_at DATETIME' },
        { name: 'approved_by', sql: 'ALTER TABLE users ADD COLUMN approved_by INT' }
    ];

    for (const column of columnsToAdd) {
        if (!existingColumns.includes(column.name.toLowerCase())) {
            try {
                await pool.query(column.sql);
                console.log(`✅ Employer approval column added: ${column.name}`);
            } catch (error) {
                console.error(`⚠️ Warning adding column ${column.name}:`, error.message);
            }
        } else {
            console.log(`✅ Column already exists: ${column.name}`);
        }
    }

    // Try to add indexes (non-critical)
    const indexStatements = [
        `ALTER TABLE users ADD INDEX IF NOT EXISTS idx_approval_status (approval_status)`,
        `ALTER TABLE users ADD INDEX IF NOT EXISTS idx_is_approved (is_approved)`
    ];

    for (const statement of indexStatements) {
        try {
            await pool.query(statement);
        } catch (error) {
            // Silently ignore index errors - they're not critical
        }
    }
};

// SQL to create scheduled_interviews table if it doesn't exist
const CREATE_SCHEDULED_INTERVIEWS_TABLE = `
    CREATE TABLE IF NOT EXISTS scheduled_interviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        application_id INT NOT NULL UNIQUE,
        interview_date DATE NOT NULL,
        interview_time TIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    )
`;

// Helper function to add columns for calendar mapping
const ADD_CALENDAR_COLUMNS = async (pool) => {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM scheduled_interviews');
        const existingColumns = columns.map(c => c.Field.toLowerCase());

        const columnsToAdd = [
            { name: 'interview_title', sql: "ALTER TABLE scheduled_interviews ADD COLUMN interview_title VARCHAR(255) DEFAULT 'Job Interview'" },
            { name: 'interview_mode', sql: "ALTER TABLE scheduled_interviews ADD COLUMN interview_mode ENUM('Online', 'Offline') DEFAULT 'Online'" },
            { name: 'meeting_link', sql: "ALTER TABLE scheduled_interviews ADD COLUMN meeting_link VARCHAR(500) DEFAULT NULL" },
            { name: 'notes', sql: "ALTER TABLE scheduled_interviews ADD COLUMN notes TEXT DEFAULT NULL" },
            { name: 'interviewer', sql: "ALTER TABLE scheduled_interviews ADD COLUMN interviewer VARCHAR(255) DEFAULT NULL" },
            { name: 'status', sql: "ALTER TABLE scheduled_interviews ADD COLUMN status ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled'" }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name.toLowerCase())) {
                await pool.query(column.sql);
                console.log(`✅ Scheduled interview column added: ${column.name}`);
            }
        }
    } catch (error) {
        console.error('⚠️ Warning adding calendar columns:', error.message);
    }
};

// Function to create required tables on startup
const initializeTables = async (pool) => {
    try {
        console.log('📋 Initializing required database tables...');

        await pool.query(CREATE_PASSWORD_RESET_TOKENS_TABLE);
        console.log('✅ password_reset_tokens table verified/created successfully.');

        await pool.query(CREATE_OTP_STORE_TABLE);
        console.log('✅ otp_store table verified/created successfully.');

        await pool.query(CREATE_ADMINS_TABLE);
        console.log('✅ admins table verified/created successfully.');

        await ADD_EMPLOYER_APPROVAL_COLUMNS(pool);
        console.log('✅ Employer approval columns verified/added successfully.');

        await pool.query(CREATE_SCHEDULED_INTERVIEWS_TABLE);
        console.log('✅ scheduled_interviews table verified/created successfully.');

        await ADD_CALENDAR_COLUMNS(pool);
        console.log('✅ scheduled_interviews calendar columns verified/added successfully.');
    } catch (error) {
        console.error('⚠️ Warning: Failed to create tables:', error.message);
        // Don't throw - allow the app to continue running
        // The table might already exist or there might be a temporary issue
    }
};

const initializeDb = async () => {
    if (db) {
        return db;
    }

    if (dbInitError) {
        throw dbInitError;
    }

    try {
        console.log('🔌 Attempting DB Connection...');
        const dbHost = getEnv('DB_HOST', false);
        const dbUser = getEnv('DB_USER', false);
        const dbPassword = getEnv('DB_PASS', false) || getEnv('DB_PASSWORD', false);
        const dbName = getEnv('DB_NAME', false);
        const dbPort = parseInt(getEnv('DB_PORT', false) || '25060', 10);

        if (!dbHost || !dbUser || !dbName) {
            throw new Error('Missing required database environment variables (DB_HOST, DB_USER, DB_NAME)');
        }

        console.log(`   - Host: ${dbHost}`);
        console.log(`   - User: ${dbUser}`);
        console.log(`   - Port: ${dbPort}`);

        // Force strict configuration object
        const dbConfig = {
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbName,
            port: dbPort,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            ssl: {
                rejectUnauthorized: false
            }
        };

        db = mysql.createPool(dbConfig);
        console.log('✅ MySQL Database Pool Initialized.');

        const [columns] = await db.query("SHOW COLUMNS FROM users");
        console.log("===== USERS TABLE =====");
        console.table(columns);

        // Initialize required tables
        await initializeTables(db);

        return db;
    } catch (error) {
        console.error('❌ FATAL: Database initialization failed!');
        console.error('   - Error:', error.message);
        dbInitError = error;
        throw error;
    }
};

export default {
    getConnection: async () => {
        try {
            const pool = await initializeDb();
            const connection = await pool.getConnection();
            return connection;
        } catch (err) {
            console.error('❌ MySQL Connection Failed!');
            console.error('   - Error:', err.message);
            console.error('   - Code:', err.code);
            throw err;
        }
    },
    query: async (sql, params) => {
        try {
            const pool = await initializeDb();
            const [rows] = await pool.query(sql, params);
            return [rows];
        } catch (err) {
            console.error('❌ MySQL Query Failed:', err.message);
            throw err;
        }
    },
    execute: async (sql, params) => {
        try {
            const pool = await initializeDb();
            const [rows] = await pool.execute(sql, params);
            return [rows];
        } catch (err) {
            console.error('❌ MySQL Execute Failed:', err.message);
            throw err;
        }
    }
};
