// backend/services/profileService.js

/**
 * Normalizes city name using project-specific mapping
 */
export function normalizeCity(rawLocation) {
  if (!rawLocation) return null;
  const city = rawLocation.toString().toLowerCase().trim();
  
  const cityMap = [
    { keywords: ["mumbai", "bombay"], normalized: "Mumbai" },
    { keywords: ["delhi", "ncr", "new delhi"], normalized: "Delhi" },
    { keywords: ["kolkata", "calcutta"], normalized: "Kolkata" },
    { keywords: ["chennai", "madras"], normalized: "Chennai" },
    { keywords: ["bangalore", "bengaluru"], normalized: "Bengaluru" },
    { keywords: ["hyderabad", "hyd"], normalized: "Hyderabad" },
    { keywords: ["ahmedabad", "amdavad"], normalized: "Ahmedabad" },
    { keywords: ["pune", "poona"], normalized: "Pune" },
    { keywords: ["gurgaon", "gurugram"], normalized: "Gurgaon" },
    { keywords: ["noida", "new okhla industrial development authority"], normalized: "Noida" },
    { keywords: ["surat", "suryapur"], normalized: "Surat" },
    { keywords: ["vadodara", "baroda", "vadodra"], normalized: "Vadodara" },
    { keywords: ["kochi", "cochin"], normalized: "Kochi" },
    { keywords: ["coimbatore", "kovai"], normalized: "Coimbatore" },
    { keywords: ["madurai", "madura"], normalized: "Madurai" },
    { keywords: ["mysore", "mysuru"], normalized: "Mysore" },
    { keywords: ["vijayawada", "bezawada"], normalized: "Vijayawada" },
    { keywords: ["nagpur", "orange city"], normalized: "Nagpur" },
    { keywords: ["indore", "mini mumbai"], normalized: "Indore" },
    { keywords: ["jaipur", "pink city"], normalized: "Jaipur" },
    { keywords: ["lucknow", "lakhnau"], normalized: "Lucknow" },
    { keywords: ["kanpur", "cawnpore"], normalized: "Kanpur" }
  ];

  for (const mapping of cityMap) {
    for (const keyword of mapping.keywords) {
      if (city.includes(keyword.toLowerCase())) {
        return mapping.normalized;
      }
    }
  }
  
  return null;
}

/**
 * Parses Excel dates formatted as serial numbers or strings
 */
export function parseExcelDate(val) {
  if (!val) return null;
  const strVal = String(val).trim().toLowerCase();
  if (['no data', 'n/a', '-', 'unknown', 'null'].includes(strVal)) return null;
  if (!isNaN(val)) {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  const date = new Date(val);
  if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  return null;
}

/**
 * Maps a single candidate object from SaarthiJobs payload into the unified profile row structure.
 */
export function mapSaarthiJobsCandidate(candidate) {
  const name = (candidate.name || '').trim();
  const email = (candidate.email || '').trim() || null;
  const phone = (candidate.phone || '').trim() || null;

  // Extract location — normalize to a canonical city name if possible,
  // otherwise keep the raw string so the candidate is still discoverable.
  // Never store null here if the candidate provided any city at all.
  const rawCity = candidate.location
    ? (candidate.location.city || candidate.location.state || null)
    : null;
  const normalizedCity = normalizeCity(rawCity) || rawCity || null;

  // Extract skills
  const skillsList = Array.isArray(candidate.skills) ? candidate.skills.join(', ') : null;

  // Extract experience info
  let totalExperience = null;
  let currentCompany = null;
  let currentPosition = null;
  let previousEmployer = null;

  if (Array.isArray(candidate.experience) && candidate.experience.length > 0) {
    // 1. Calculate total experience from date ranges
    let totalMonths = 0;
    candidate.experience.forEach(exp => {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const isCurrent = exp.isOngoing || exp.isCurrent;
      const end = exp.endDate ? new Date(exp.endDate) : (isCurrent ? new Date() : null);
      if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diffTime = Math.abs(end - start);
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        totalMonths += diffMonths;
      }
    });
    if (totalMonths > 0) {
      totalExperience = parseFloat((totalMonths / 12).toFixed(1));
    }

    // 2. Extract current company and position
    const currentJob = candidate.experience.find(exp => exp.isOngoing || exp.isCurrent || !exp.endDate) || candidate.experience[0];
    if (currentJob) {
      currentCompany = currentJob.company || currentJob.companyName || currentJob.employer || null;
      currentPosition = currentJob.role || currentJob.designation || currentJob.title || currentJob.position || null;
    }

    // 3. Extract previous employer
    const prevJobs = candidate.experience.filter(exp => exp !== currentJob);
    if (prevJobs.length > 0) {
      const prevJob = prevJobs[0];
      previousEmployer = prevJob.company || prevJob.companyName || prevJob.employer || null;
    }
  }

  // Extract education degree
  let lastEducation = null;
  if (Array.isArray(candidate.education) && candidate.education.length > 0) {
    const highestEd = candidate.education[0];
    lastEducation = highestEd.degree || highestEd.qualification || highestEd.fieldOfStudy || null;
  }

  return {
    name,
    email,
    phone,
    current_location: normalizedCity,
    designation: currentPosition,
    industry: null,
    total_experience: totalExperience,
    annual_salary: null,
    salary_text: null,
    department: null,
    company_name: currentCompany,
    dob: null,
    age: null,
    gender: null,
    last_education: lastEducation,
    notice_period: null,
    previous_employer: previousEmployer,
    key_skills: skillsList
  };
}

/**
 * Unified upsert function to create or update profiles in the database.
 * Matches existing profiles by email first, and if email is not found/unavailable, by phone.
 * @param {object} db - Database pool or connection
 * @param {Array<object>} profiles - Mapped profile rows to insert/update
 * @param {number} userId - Uploader/Creator user ID
 * @returns {Promise<object>} Stats describing inserted, updated, and skipped profiles
 */
export async function upsertProfiles(db, profiles, userId) {
  if (!profiles || profiles.length === 0) {
    return { processed: 0, inserted: 0, updated: 0, id: null };
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let lastId = null;

  // Extract unique emails and phones to perform batch lookup
  const emails = profiles.map(p => p.email).filter(e => e && e.trim());
  const phones = profiles.map(p => p.phone).filter(ph => ph && ph.trim());

  const emailToIdMap = new Map();
  const phoneToIdMap = new Map();

  // If we have lookup criteria, fetch potential duplicate profiles
  if (emails.length > 0 || phones.length > 0) {
    const conditions = [];
    const params = [];

    if (emails.length > 0) {
      conditions.push(`email IN (${emails.map(() => '?').join(',')})`);
      params.push(...emails);
    }
    if (phones.length > 0) {
      conditions.push(`phone IN (${phones.map(() => '?').join(',')})`);
      params.push(...phones);
    }

    const [existingRows] = await db.query(
      `SELECT id, email, phone FROM profiles WHERE ${conditions.join(' OR ')}`,
      params
    );

    existingRows.forEach(row => {
      if (row.email) emailToIdMap.set(row.email.toLowerCase().trim(), row.id);
      if (row.phone) phoneToIdMap.set(row.phone.trim(), row.id);
    });
  }

  // Process profiles one by one
  for (const profile of profiles) {
    const emailKey = profile.email ? profile.email.toLowerCase().trim() : null;
    const phoneKey = profile.phone ? profile.phone.trim() : null;

    let existingId = null;
    if (emailKey && emailToIdMap.has(emailKey)) {
      existingId = emailToIdMap.get(emailKey);
    } else if (phoneKey && phoneToIdMap.has(phoneKey)) {
      existingId = phoneToIdMap.get(phoneKey);
    }

    const name = (profile.name || '').trim();
    const alphabet = name ? name[0].toUpperCase() : 'Unknown';

    if (existingId) {
      // UPDATE existing candidate profile
      const updateSql = `
        UPDATE profiles 
        SET 
          name = ?,
          candidate_name = ?,
          alphabet = ?,
          current_location = COALESCE(?, current_location),
          designation = COALESCE(?, designation),
          industry = COALESCE(?, industry),
          total_experience = COALESCE(?, total_experience),
          annual_salary = COALESCE(?, annual_salary),
          salary_text = COALESCE(?, salary_text),
          department = COALESCE(?, department),
          company_name = COALESCE(?, company_name),
          dob = COALESCE(?, dob),
          age = COALESCE(?, age),
          gender = COALESCE(?, gender),
          last_education = COALESCE(?, last_education),
          qualification = COALESCE(?, last_education),
          notice_period = COALESCE(?, notice_period),
          previous_employer = COALESCE(?, previous_employer),
          key_skills = COALESCE(?, key_skills),
          skills = COALESCE(?, key_skills),
          updated_at = NOW()
        WHERE id = ?
      `;

      const updateParams = [
        name,
        name,
        alphabet,
        profile.current_location,
        profile.designation,
        profile.industry,
        profile.total_experience,
        profile.annual_salary,
        profile.salary_text,
        profile.department,
        profile.company_name,
        profile.dob,
        profile.age,
        profile.gender,
        profile.last_education,
        profile.last_education,   // qualification = COALESCE(?, last_education)
        profile.notice_period,
        profile.previous_employer,
        profile.key_skills,
        profile.key_skills,       // skills = COALESCE(?, key_skills)
        existingId
      ];

      await db.execute(updateSql, updateParams);
      lastId = existingId;
      updatedCount++;
    } else {
      // INSERT new candidate profile
      const insertSql = `
        INSERT INTO profiles (
          name, candidate_name, alphabet, email, phone, current_location,
          designation, industry, total_experience, annual_salary, salary_text,
          department, company_name, dob, age, gender, last_education, qualification,
          notice_period, previous_employer, key_skills, skills, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const insertParams = [
        name,
        name,
        alphabet,
        profile.email || null,
        profile.phone || null,
        profile.current_location || null,
        profile.designation || null,
        profile.industry || null,
        profile.total_experience || null,
        profile.annual_salary || null,
        profile.salary_text || null,
        profile.department || null,
        profile.company_name || null,
        profile.dob || null,
        profile.age || null,
        profile.gender || null,
        profile.last_education || null,
        profile.last_education || null, // qualification
        profile.notice_period || null,
        profile.previous_employer || null,
        profile.key_skills || null,
        profile.key_skills || null, // skills
        userId || null
      ];

      const [insertResult] = await db.execute(insertSql, insertParams);
      lastId = insertResult.insertId;
      insertedCount++;
    }
  }

  return {
    processed: profiles.length,
    inserted: insertedCount,
    updated: updatedCount,
    id: lastId
  };
}
