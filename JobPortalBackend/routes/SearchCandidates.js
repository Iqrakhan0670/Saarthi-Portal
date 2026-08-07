
import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";
import { getEnv } from '../utils/envLoader.js'; 

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET')); 
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { keywords, location } = req.query;
    console.log("🔍 Search request - keywords:", keywords, "location:", location);

    // Validate input length to prevent abuse
    if (keywords && keywords.length > 100) {
      return res.status(400).json({ error: "Keywords too long (max 100 characters)" });
    }
    if (location && location.length > 100) {
      return res.status(400).json({ error: "Location too long (max 100 characters)" });
    }

    // Safe base query - just select all candidates
    let query = `
      SELECT id, first_name, last_name, email, preferred_location, profile_summary, resume_url
      FROM user_profiles
      WHERE first_name IS NOT NULL
    `;
    let params = [];

    // Add keyword search if provided
    if (keywords && keywords.trim()) {
      // Sanitize input by escaping special SQL wildcard characters
      const sanitizedKeywords = keywords.trim().replace(/[%_]/g, '\\$\u0026');
      const searchTerm = `%${sanitizedKeywords}%`;
      query += ` AND (
        first_name LIKE ? OR
        last_name LIKE ? OR
        profile_summary LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add location filter if provided
    if (location && location.trim()) {
      // Sanitize input
      const sanitizedLocation = location.trim().replace(/[%_]/g, '\\$\u0026');
      query += ` AND preferred_location LIKE ?`;
      params.push(`%${sanitizedLocation}%`);
    }

    query += ` ORDER BY updated_at DESC LIMIT 50`;

    console.log("📋 Built query:", query);
    console.log("📊 Query params:", params);

    const [rows] = await db.query(query, params);
    console.log("✅ Search returned:", rows.length, "candidates");

    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Search candidates error:", error.message);
    console.error("📍 Full error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

export default router;