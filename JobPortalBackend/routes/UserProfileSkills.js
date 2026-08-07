import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";
import { getEnv } from '../utils/envLoader.js'; // Added import

const router = express.Router();

const authenticateToken = (req, res, next) => {
  console.log("🔍 Authenticating token...", new Date().toISOString());
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token received:", token ? "Present" : "Missing");
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET')); // Changed
    console.log("Decoded token:", decoded);
    req.user = decoded;
    console.log("✅ Token authenticated, user:", decoded.email, "user_id:", decoded.id);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/userskills request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    const [skills] = await db.query("SELECT skill_name, created_at FROM user_skills WHERE user_profile_id = ?", [profile[0].id]);
    console.log("✅ Fetched skills for user ID:", req.user.id, "Data:", skills);
    res.status(200).json(skills);
  } catch (error) {
    console.error("❌ Error fetching skills:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: getEnv('NODE_ENV', false) === "development" ? error.message : "Something went wrong", // Changed
    });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/userskills request for user ID:", req.user.id, new Date().toISOString());
  const { skillName } = req.body;
  console.log("Request body:", req.body);

  if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
    console.log("❌ Validation error: skillName is required");
    return res.status(400).json({ errors: ["skillName is required"] });
  }

  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    await db.query(
      "INSERT INTO user_skills (user_profile_id, skill_name) VALUES (?, ?)",
      [profile[0].id, skillName.trim()]
    );
    console.log("✅ Added skill for user ID:", req.user.id, "Skill:", skillName);
    res.status(201).json({ message: "Skill added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate skill entry for user ID:", req.user.id, "Skill:", skillName);
      return res.status(400).json({ error: "Skill already exists for this user" });
    }
    console.error("❌ Error adding skill:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: getEnv('NODE_ENV', false) === "development" ? error.message : "Something went wrong", // Changed
    });
  }
});

router.delete("/:skillName", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/userskills request for user ID:", req.user.id, new Date().toISOString());
  const { skillName } = req.params;
  console.log("Skill to delete:", skillName);

  if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
    console.log("❌ Validation error: skillName is required");
    return res.status(400).json({ errors: ["skillName is required"] });
  }

  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    const [result] = await db.query(
      "DELETE FROM user_skills WHERE user_profile_id = ? AND skill_name = ?",
      [profile[0].id, skillName.trim()]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Skill not found for user ID:", req.user.id, "Skill:", skillName);
      return res.status(404).json({ error: "Skill not found" });
    }

    console.log("✅ Deleted skill for user ID:", req.user.id, "Skill:", skillName);
    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting skill:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: getEnv('NODE_ENV', false) === "development" ? error.message : "Something went wrong", // Changed
    });
  }
});

export default router;