import express from "express";
import db from '../config/database.js'; // Ensure this path is correct for your project
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../utils/envLoader.js'; // Added import

const router = express.Router();

// Login route loaded successfully

router.post("/", async (req, res) => {
    console.log("📍 ROUTER HIT: Starting Login Process...");
    
    // 2. Check if data arrived
    console.log("📦 Received Data:", req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        console.log("❌ Missing Email or Password");
        return res.status(400).json({ message: "Missing email or password" });
    }

    try {
        // 3. Test Database Connection
        console.log(`🔍 Checking DB for user: ${email}`);
        
        // Run Query
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        console.log(`📊 DB Result: Found ${users.length} users`);

        if (users.length === 0) {
            console.log("❌ User not found in DB");
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const user = users[0];

        // 3.5 Check if employer is approved (job_poster users must be approved)
        // Handle case where column might not exist yet (gracefully allows login if column doesn't exist)
        if (user.user_type === 'job_poster' && user.hasOwnProperty('is_approved') && !user.is_approved) {
            console.log("❌ Employer account not approved by admin");
            return res.status(403).json({ 
                message: "Your employer account is awaiting admin approval. Please check back later.",
                requiresApproval: true 
            });
        }

        // 4. Check Password
        console.log("🔑 Verifying Password...");
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log("❌ Password does not match");
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 5. Success!
        console.log("✅ Password Matched! Generating Token...");
        const token = jwt.sign(
            { id: user.id, role: user.user_type }, 
            getEnv('JWT_SECRET'), 
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.user_type
            }
        });

    } catch (error) {
        console.error("🔥 CRASH INSIDE ROUTE:", error);
        res.status(500).json({ message: "Server error: " + error.message });
    }
});

export default router;