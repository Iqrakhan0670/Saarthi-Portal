/**
 * utils/saarthiIQService.js
 *
 * Responsible for syncing a candidate from SaarthiJobs → SaarthiIQ.
 *
 * Design decisions:
 *  - Fire-and-forget: callers should never await this or catch its errors.
 *    Use `.catch(() => {})` at the call site.
 *  - Non-blocking: a failed sync must NEVER fail the originating HTTP request.
 *  - Configurable endpoint: once SaarthiIQ is live, only SAARTHIQ_IMPORT_PATH
 *    needs to be updated in .env. No code changes required.
 *  - 10-second timeout: prevents slow syncs from holding open connections.
 *
 * Environment variables used:
 *   SAARTHIQ_API_URL      - Base URL of the SaarthiIQ API  (e.g. https://api.saarthiq.in)
 *   SAARTHIQ_API_KEY      - API key sent as Bearer token
 *   SAARTHIQ_IMPORT_PATH  - Import endpoint path           (default: /api/candidates/import)
 *                           ⚠️  PLACEHOLDER — update when SaarthiIQ endpoint is implemented
 */

import axios from 'axios';
import db from '../config/database.js';
import { getEnv } from './envLoader.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SYNC_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * The import path on SaarthiIQ that receives candidate data.
 *
 * ⚠️  PLACEHOLDER: This endpoint does not yet exist on SaarthiIQ.
 *     When the SaarthiIQ team implements it, set SAARTHIQ_IMPORT_PATH
 *     in the .env file. No code changes are needed here.
 */
// Removed module-level IMPORT_PATH to resolve ESM hoisting issue

// ─── Payload Builder ─────────────────────────────────────────────────────────

/**
 * Fetches the full candidate profile from the database and merges it with
 * any already-parsed resume data (from Gemini) to produce the SaarthiIQ payload.
 *
 * @param {number} userId     - The SaarthiJobs user ID
 * @param {object} [hints={}] - Optional pre-parsed data to enrich the payload:
 *   - hints.resumeUrl {string}  - GCS URL of the just-uploaded resume
 *   - hints.parsed    {object}  - Full Gemini-parsed resume object (from autofill)
 * @returns {Promise<object>}   - The payload object for SaarthiIQ
 */
async function buildCandidatePayload(userId, hints = {}) {
  // Fetch core user info
  const [users] = await db.query(
    `SELECT id, full_name, email, mobile_number FROM users WHERE id = ?`,
    [userId]
  );

  if (users.length === 0) {
    throw new Error(`[SaarthiIQ Sync] User ${userId} not found in DB — cannot build payload`);
  }

  const user = users[0];

  // Fetch profile row (may not exist for brand-new users)
  const [profiles] = await db.query(
    `SELECT first_name, last_name, email AS profile_email, phone,
            city, state, country, profile_summary, resume_url
     FROM user_profiles WHERE user_id = ?`,
    [userId]
  );

  const profile = profiles[0] || {};

  // Fetch skills
  const [skillRows] = await db.query(
    `SELECT us.skill_name
     FROM user_skills us
     JOIN user_profiles up ON up.id = us.user_profile_id
     WHERE up.user_id = ?`,
    [userId]
  );
  const skills = skillRows.map((r) => r.skill_name);

  // Fetch experience / employment
  const [expRows] = await db.query(
    `SELECT ue.company_name, ue.position, ue.start_date, ue.end_date, ue.is_ongoing
     FROM user_employment ue
     JOIN user_profiles up ON up.id = ue.user_profile_id
     WHERE up.user_id = ?
     ORDER BY ue.start_date DESC`,
    [userId]
  );
  const experience = expRows.map((e) => ({
    company: e.company_name,
    role: e.position,
    startDate: e.start_date ? e.start_date.toISOString().slice(0, 10) : null,
    endDate: e.is_ongoing ? null : (e.end_date ? e.end_date.toISOString().slice(0, 10) : null),
    isOngoing: !!e.is_ongoing,
  }));

  // Fetch education
  const [eduRows] = await db.query(
    `SELECT ued.degree, ued.institution, ued.end_year
     FROM user_education ued
     JOIN user_profiles up ON up.id = ued.user_profile_id
     WHERE up.user_id = ?
     ORDER BY ued.end_year DESC`,
    [userId]
  );
  const education = eduRows.map((e) => ({
    degree: e.degree,
    institution: e.institution,
    year: e.end_year,
  }));

  // Resolve email — prefer profile, fall back to users.email
  const email = profile.profile_email || user.email || '';

  // Resolve candidate name — prefer profile fields, fall back to users.full_name,
  // then to the email username as a last resort (prevents a 400 from the sync endpoint
  // when the user hasn't completed their profile yet).
  const emailUsername = email ? email.split('@')[0].replace(/[._-]+/g, ' ').trim() : '';
  const candidateName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    user.full_name ||
    emailUsername ||
    '';

  // Resolve phone — prefer profile, fall back to users.mobile_number
  const phone = profile.phone || user.mobile_number || null;

  // Resume URL: use hint (freshly uploaded) > DB value
  const resumeUrl = hints.resumeUrl || profile.resume_url || null;

  // Location
  const location = {
    city: profile.city || null,
    state: profile.state || null,
    country: profile.country || null,
  };

  // If autofill parsed data is available, enrich from it (avoids stale-DB-read issue)
  const parsed = hints.parsed || null;
  const finalSkills = (parsed?.skills?.length > 0 ? parsed.skills : skills);

  return {
    // Context so SaarthiIQ knows the data source
    source: 'saarthijobs',

    candidate: {
      userId: user.id,
      name: candidateName,
      email,
      phone,
      resumeUrl,
      location,
      skills: finalSkills,
      experience,
      education,
      profileSummary: profile.profile_summary || parsed?.summary || null,
      syncedAt: new Date().toISOString(),
    },
  };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Syncs a candidate to SaarthiIQ. Designed to be called fire-and-forget:
 *
 *   syncCandidateToSaarthiIQ(userId, { resumeUrl }).catch(() => {});
 *
 * The function NEVER throws. All errors are caught and logged internally.
 *
 * @param {number} userId     - SaarthiJobs user ID
 * @param {object} [hints={}] - { resumeUrl?, parsed? } — optional enrichment data
 * @returns {Promise<void>}
 */
export async function syncCandidateToSaarthiIQ(userId, hints = {}) {
  const apiUrl = getEnv('SAARTHIQ_API_URL', false);
  const apiKey = getEnv('SAARTHIQ_API_KEY', false);

  if (!apiUrl || !apiKey) {
    console.warn(
      `[SaarthiIQ Sync] ⚠️  SAARTHIQ_API_URL or SAARTHIQ_API_KEY not configured — skipping sync for user ${userId}`
    );
    return;
  }

  const importPath = getEnv('SAARTHIQ_IMPORT_PATH', false) || '/api/candidates/import';
  const endpoint = `${apiUrl}${importPath}`;

  console.log(`[SaarthiIQ Sync] 🚀 Attempting sync for user ${userId} → ${endpoint}`);

  let payload;
  try {
    payload = await buildCandidatePayload(userId, hints);
  } catch (buildErr) {
    console.error(
      `[SaarthiIQ Sync] ❌ Failed to build payload for user ${userId}:`,
      buildErr.message
    );
    return; // Swallow — do not propagate
  }

  // Guard: SaarthiIQ requires at minimum a name AND an email or phone.
  // Without these, the endpoint returns 400 and the candidate is silently lost.
  const c = payload?.candidate;
  if (!c?.name?.trim()) {
    console.warn(
      `[SaarthiIQ Sync] ⚠️  Skipping sync for user ${userId} — candidate name is empty. ` +
        `Complete your profile in SaarthiJobs first.`
    );
    return;
  }
  if (!c?.email && !c?.phone) {
    console.warn(
      `[SaarthiIQ Sync] ⚠️  Skipping sync for user ${userId} — no email or phone available. ` +
        `Profile must have at least one contact method.`
    );
    return;
  }

  try {
    const response = await axios.post(endpoint, payload, {
      timeout: SYNC_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Source': 'saarthijobs',
      },
    });

    console.log(
      `[SaarthiIQ Sync] ✅ Sync successful for user ${userId}. ` +
        `Status: ${response.status}, candidateId: ${response.data?.candidateId ?? 'N/A'}`
    );
  } catch (httpErr) {
    // Distinguish between timeout, network error, and HTTP error responses
    if (httpErr.code === 'ECONNABORTED') {
      console.error(
        `[SaarthiIQ Sync] ⏱️  Timeout after ${SYNC_TIMEOUT_MS}ms for user ${userId}. ` +
          `Endpoint: ${endpoint}`
      );
    } else if (httpErr.response) {
      // SaarthiIQ returned an HTTP error (4xx / 5xx)
      console.error(
        `[SaarthiIQ Sync] ⚠️  HTTP ${httpErr.response.status} from SaarthiIQ for user ${userId}. ` +
          `Body: ${JSON.stringify(httpErr.response.data)}`
      );
    } else {
      // Network-level failure (DNS, connection refused, etc.)
      console.error(
        `[SaarthiIQ Sync] ❌ Network error syncing user ${userId}:`,
        httpErr.message
      );
    }
    // All errors swallowed — upload must not be affected
  }
}
