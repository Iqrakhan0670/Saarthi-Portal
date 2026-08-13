// backend/routes/sync.js
import express from 'express';
import pool from '../db.js';
import { validateSaarthiJobsApiKey } from '../middleware/saarthiJobsAuth.js';
import { mapSaarthiJobsCandidate, upsertProfiles } from '../services/profileService.js';

const router = express.Router();

/**
 * POST /api/sync/saarthijobs
 * Receives candidate sync payload from SaarthiJobs, validates it, and performs upsert.
 */
router.post('/saarthijobs', validateSaarthiJobsApiKey, async (req, res) => {
  try {
    const { source, candidate } = req.body;

    // Validate top-level payload structure
    if (!source || source !== 'saarthijobs') {
      return res.status(400).json({
        success: false,
        message: 'Invalid source. Source must be "saarthijobs".'
      });
    }

    if (!candidate || typeof candidate !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid candidate object.'
      });
    }

    // Validate mandatory candidate fields
    if (!candidate.name || !candidate.name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name is required.'
      });
    }

    // Must have at least one identifier (email or phone) to look up/prevent duplicates
    const email = candidate.email ? candidate.email.trim() : '';
    const phone = candidate.phone ? candidate.phone.trim() : '';

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Candidate must have at least an email or a phone number.'
      });
    }

    console.log(candidate.name);

    // Map candidate to the unified Excel row profile structure
    const mappedProfile = mapSaarthiJobsCandidate(candidate);

    // Perform upsert using the shared candidate creation service
    const stats = await upsertProfiles(pool, [mappedProfile], null);

    const action = stats.inserted > 0 ? 'inserted' : 'updated';
    const httpStatus = action === 'inserted' ? 201 : 200;

    console.log(`✅ Candidate sync successful: ID ${stats.id} was ${action}`);

    res.status(httpStatus).json({
      success: true,
      message: `Candidate successfully ${action}.`,
      data: {
        id: stats.id,
        action: action
      }
    });

  } catch (error) {
    console.error('❌ Candidate Sync API Error:', error.message || error);
    
    // Clean response, never leak internal database errors or stack traces
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize candidate due to an internal server error.'
    });
  }
});

export default router;
