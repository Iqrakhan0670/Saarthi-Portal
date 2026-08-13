// routes/UserProfileAutofill.js
// POST /api/profile/autofill — saves parsed resume data to all profile sub-tables

import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { getEnv } from '../utils/envLoader.js';
import { syncCandidateToSaarthiIQ } from '../utils/saarthiIQService.js';

const router = express.Router();

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  try {
    req.user = jwt.verify(token, getEnv('JWT_SECRET'));
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token', details: err.message });
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Parses a year string into an integer, returns null on failure
const parseYear = (yearStr) => {
  if (!yearStr) return null;
  const n = parseInt(String(yearStr).replace(/\D/g, '').slice(0, 4));
  return (!isNaN(n) && n >= 1950 && n <= new Date().getFullYear() + 5) ? n : null;
};

// Parses a date string to YYYY-MM-DD, returns null on failure
const parseDate = (dateStr) => {
  if (!dateStr || dateStr.toLowerCase().includes('present')) return null;
  // Try to extract year-month from strings like "June 2022", "2022-06", "Jun 2022 - Dec 2023"
  const m = String(dateStr).match(/(\d{4})/);
  if (!m) return null;
  const year = parseInt(m[1]);
  return `${year}-01-01`; // Approximate to Jan of that year if no month
};

const safe = (str, max = 255) => (typeof str === 'string' ? str.trim().slice(0, max) : null);
const safeArr = (arr) => (Array.isArray(arr) ? arr : []);

// ─── Main Autofill Route ──────────────────────────────────────────────────────
// POST /api/profile/autofill
router.post('/autofill', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  console.log(`[Autofill] Starting autofill for user ${userId}`);

  const {
    parsed,       // The full parsed JSON from Gemini
    sections = [] // Which sections to apply: e.g. ['basicInfo','skills','education',...]
  } = req.body;

  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid parsed resume data.' });
  }

  const applyAll = sections.length === 0;
  const should = (section) => applyAll || sections.includes(section);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ── Fetch / create user_profile row ──────────────────────────────────────
    let [profiles] = await connection.query(
      'SELECT id FROM user_profiles WHERE user_id = ?', [userId]
    );

    let profileId;
    if (profiles.length === 0) {
      // Create a minimal profile row if it doesn't exist
      const [ins] = await connection.query(
        'INSERT INTO user_profiles (user_id) VALUES (?)', [userId]
      );
      profileId = ins.insertId;
      console.log(`[Autofill] Created new user_profile (id=${profileId}) for user ${userId}`);
    } else {
      profileId = profiles[0].id;
    }

    // ── 1. Basic Info ─────────────────────────────────────────────────────────
    if (should('basicInfo') && parsed) {
      const rawName = (parsed.name || '').trim();
      const nameParts = rawName.split(/\s+/);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;

      // Split location into city + state, but ONLY accept state if it's a real
      // state/country name — skill names (Redux, Tailwind, etc.) must be rejected.
      const KNOWN_STATES_BE = [
        'maharashtra', 'karnataka', 'tamil nadu', 'telangana', 'andhra pradesh', 'kerala',
        'gujarat', 'rajasthan', 'uttar pradesh', 'madhya pradesh', 'west bengal', 'bihar',
        'punjab', 'haryana', 'delhi', 'goa', 'odisha', 'jharkhand', 'chhattisgarh',
        'assam', 'himachal pradesh', 'uttarakhand', 'jammu', 'kashmir',
        'mh', 'ka', 'tn', 'ts', 'ap', 'kl', 'gj', 'rj', 'up', 'mp', 'wb',
        'california', 'new york', 'texas', 'florida', 'washington', 'ontario',
        'india', 'usa', 'uk', 'us', 'canada', 'australia', 'germany', 'france',
      ];

      const rawLocParts = (parsed.location || '').split(',').map(p => p.trim()).filter(Boolean);
      const city = safe(rawLocParts[0]);
      const rawState = rawLocParts[1] || '';
      const rawStateLower = rawState.toLowerCase().replace(/[^a-z\s]/g, '').trim();
      const isValidState = rawStateLower &&
        KNOWN_STATES_BE.some(s => rawStateLower === s || rawStateLower.includes(s));
      const state = isValidState ? safe(rawState) : null;

      const updates = [];
      const params = [];

      // Always write city and state to database (even if empty string) to clear old values
      // if they aren't mentioned in the new resume
      updates.push('city = ?');
      params.push(city || '');
      updates.push('state = ?');
      params.push(state || '');

      // Only set these fields if parsed value exists
      if (firstName) {
        updates.push('first_name = ?');
        params.push(firstName);
      }
      if (lastName) {
        updates.push('last_name = ?');
        params.push(lastName);
      }
      if (parsed.email) {
        updates.push('email = ?');
        params.push(safe(parsed.email));
      }
      if (parsed.phone) {
        updates.push('phone = ?');
        params.push(safe(parsed.phone).replace(/\s+/g, ' '));
      }
      if (parsed.summary) {
        updates.push('profile_summary = ?');
        params.push(safe(parsed.summary, 2000));
      }

      if (updates.length > 0) {
        params.push(profileId);
        await connection.query(
          `UPDATE user_profiles SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
        console.log(`[Autofill] Updated basic info (city: ${city}, state: ${state}) for profile ${profileId}`);
      }
    }

    // ── 2. Skills ─────────────────────────────────────────────────────────────
    if (should('skills') && safeArr(parsed.skills).length > 0) {
      await connection.query('DELETE FROM user_skills WHERE user_profile_id = ?', [profileId]);

      const skills = [...new Set(safeArr(parsed.skills)
        .filter(s => typeof s === 'string' && s.trim().length > 0)
        .map(s => s.trim().slice(0, 100))
      )];

      if (skills.length > 0) {
        const skillValues = skills.map(s => [profileId, s]);
        await connection.query(
          'INSERT IGNORE INTO user_skills (user_profile_id, skill_name) VALUES ?',
          [skillValues]
        );
        console.log(`[Autofill] Inserted ${skills.length} skills for profile ${profileId}`);
      }
    }

    // ── 3. Languages ──────────────────────────────────────────────────────────
    if (should('languages') && safeArr(parsed.languages).length > 0) {
      await connection.query('DELETE FROM user_languages WHERE user_profile_id = ?', [profileId]);

      const langs = [...new Set(safeArr(parsed.languages)
        .filter(l => typeof l === 'string' && l.trim().length > 0)
        .map(l => l.trim().slice(0, 100))
      )];

      if (langs.length > 0) {
        const langValues = langs.map(l => [profileId, l, 'Intermediate']);
        await connection.query(
          'INSERT IGNORE INTO user_languages (user_profile_id, language_name, proficiency) VALUES ?',
          [langValues]
        );
        console.log(`[Autofill] Inserted ${langs.length} languages for profile ${profileId}`);
      }
    }

    // ── 4. Education ──────────────────────────────────────────────────────────
    if (should('education') && safeArr(parsed.education).length > 0) {
      await connection.query('DELETE FROM user_education WHERE user_profile_id = ?', [profileId]);

      const eduRecords = safeArr(parsed.education).filter(
        e => e && (e.degree || e.institution)
      );

      for (const edu of eduRecords) {
        const year = parseYear(edu.year);
        await connection.query(
          `INSERT INTO user_education
           (user_profile_id, degree, institution, course_type, end_year)
           VALUES (?, ?, ?, 'Full Time', ?)`,
          [
            profileId,
            safe(edu.degree) || 'Unknown Degree',
            safe(edu.institution) || 'Unknown Institution',
            year
          ]
        );
      }
      console.log(`[Autofill] Inserted ${eduRecords.length} education records for profile ${profileId}`);
    }

    // ── 5. Employment (Experience) ────────────────────────────────────────────
    if (should('experience') && safeArr(parsed.experience).length > 0) {
      // Delete existing employment + skills
      const [existingEmps] = await connection.query(
        'SELECT id FROM user_employment WHERE user_profile_id = ?', [profileId]
      );
      if (existingEmps.length > 0) {
        const empIds = existingEmps.map(e => e.id);
        await connection.query(
          'DELETE FROM user_employment_skills WHERE user_employment_id IN (?)', [empIds]
        );
        await connection.query('DELETE FROM user_employment WHERE user_profile_id = ?', [profileId]);
      }

      const expRecords = safeArr(parsed.experience).filter(e => e && (e.company || e.role));

      for (const exp of expRecords) {
        const durationStr = safe(exp.duration) || '';
        const parts = durationStr.split(/[-–—]/);
        const startDate = parseDate(parts[0]?.trim()) || '2020-01-01';
        const endRaw = parts[1]?.trim();
        const isOngoing = !endRaw || endRaw.toLowerCase().includes('present');
        const endDate = isOngoing ? null : parseDate(endRaw);

        const responsibilities = safeArr(exp.responsibilities)
          .filter(r => typeof r === 'string')
          .slice(0, 10)
          .join('\n');

        const [empResult] = await connection.query(
          `INSERT INTO user_employment
           (user_profile_id, company_name, position, start_date, end_date, is_ongoing, work_description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            profileId,
            safe(exp.company, 200) || 'Unknown Company',
            safe(exp.role, 200) || 'Unknown Role',
            startDate,
            endDate,
            isOngoing ? 1 : 0,
            responsibilities.slice(0, 2000) || null
          ]
        );

        const empId = empResult.insertId;

        // Insert employment skills from exp.techStack (if any)
        const expSkills = safeArr(exp.techStack || exp.skills || [])
          .filter(s => typeof s === 'string' && s.trim().length > 0)
          .map(s => s.trim().slice(0, 100));

        if (expSkills.length > 0) {
          const uniqueExpSkills = [...new Set(expSkills)];
          const skillVals = uniqueExpSkills.map(s => [empId, s]);
          await connection.query(
            'INSERT IGNORE INTO user_employment_skills (user_employment_id, skill_name) VALUES ?',
            [skillVals]
          );
        }
      }
      console.log(`[Autofill] Inserted ${expRecords.length} experience records for profile ${profileId}`);
    }

    // ── 6. Projects ───────────────────────────────────────────────────────────
    if (should('projects') && safeArr(parsed.projects).length > 0) {
      // Delete existing project technologies then projects
      const [existingProjects] = await connection.query(
        'SELECT id FROM user_projects WHERE user_profile_id = ?', [profileId]
      );
      if (existingProjects.length > 0) {
        const projIds = existingProjects.map(p => p.id);
        await connection.query(
          'DELETE FROM user_project_technologies WHERE user_project_id IN (?)', [projIds]
        );
        await connection.query('DELETE FROM user_projects WHERE user_profile_id = ?', [profileId]);
      }

      const projectRecords = safeArr(parsed.projects).filter(p => p && p.name);

      for (const proj of projectRecords) {
        const [projResult] = await connection.query(
          `INSERT INTO user_projects (user_profile_id, title, description)
           VALUES (?, ?, ?)`,
          [
            profileId,
            safe(proj.name, 200) || 'Untitled Project',
            safe(proj.description, 2000) || 'N/A'
          ]
        );

        const projId = projResult.insertId;

        const techStack = safeArr(proj.techStack)
          .filter(t => typeof t === 'string' && t.trim().length > 0)
          .map(t => t.trim().slice(0, 100));

        if (techStack.length > 0) {
          const techVals = [...new Set(techStack)].map(t => [projId, t]);
          await connection.query(
            'INSERT IGNORE INTO user_project_technologies (user_project_id, technology_name) VALUES ?',
            [techVals]
          );
        }
      }
      console.log(`[Autofill] Inserted ${projectRecords.length} projects for profile ${profileId}`);
    }

    // ── 7. Certifications → user_accomplishments_certifications ──────────────
    if (should('certifications') && safeArr(parsed.certifications).length > 0) {
      await connection.query(
        'DELETE FROM user_accomplishments_certifications WHERE user_profile_id = ?', [profileId]
      );

      const certs = safeArr(parsed.certifications)
        .filter(c => typeof c === 'string' && c.trim().length > 0)
        .map(c => c.trim().slice(0, 255));

      if (certs.length > 0) {
        const certVals = certs.map(c => [profileId, c, 'Unknown', null]);
        await connection.query(
          'INSERT INTO user_accomplishments_certifications (user_profile_id, name, issuer, year) VALUES ?',
          [certVals]
        );
        console.log(`[Autofill] Inserted ${certs.length} certifications for profile ${profileId}`);
      }
    }

    await connection.commit();
    console.log(`[Autofill] ✅ Autofill committed successfully for user ${userId}`);

    // ── SaarthiIQ Sync ────────────────────────────────────────────────────────
    // Fire-and-forget: syncs the fully-enriched candidate to SaarthiIQ.
    // We pass `parsed` directly so the service can use Gemini data without
    // extra DB round-trips. The upload/autofill response is not blocked.
    syncCandidateToSaarthiIQ(userId, { parsed }).catch(() => {});
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(200).json({
      success: true,
      message: 'Profile autofilled successfully.',
      profileId,
      sectionsApplied: applyAll ? 'all' : sections
    });

  } catch (err) {
    if (connection) {
      try { await connection.rollback(); } catch (_) {}
    }
    console.error(`[Autofill] ❌ Error during autofill for user ${userId}:`, err.message);
    return res.status(500).json({
      error: 'Autofill failed. Database transaction rolled back.',
      details: getEnv('NODE_ENV', false) === 'DEVELOPMENT' ? err.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;
