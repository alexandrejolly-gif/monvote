import { supabase } from '../lib/supabase.js';
import { verifyAdmin } from '../lib/auth.js';

// Import all admin handlers from lib/admin-handlers
import stats from '../lib/admin-handlers/stats.js';
import candidats from '../lib/admin-handlers/candidats.js';
import submissions from '../lib/admin-handlers/submissions.js';
import candidat from '../lib/admin-handlers/candidat.js';
import validate from '../lib/admin-handlers/validate.js';
import viewSubmission from '../lib/admin-handlers/view-submission.js';
import addCandidatsManually from '../lib/admin-handlers/add-candidats-manually.js';
import addCommune from '../lib/admin-handlers/add-commune.js';
import updateCommune from '../lib/admin-handlers/update-commune.js';
import checkCommuneCandidats from '../lib/admin-handlers/check-commune-candidats.js';
import checkQuestions from '../lib/admin-handlers/check-questions.js';
import cleanupFakeCandidats from '../lib/admin-handlers/cleanup-fake-candidats.js';
import deleteQuestions from '../lib/admin-handlers/delete-questions.js';
import diagnostic from '../lib/admin-handlers/diagnostic.js';
import fillMissingProfiles from '../lib/admin-handlers/fill-missing-profiles.js';
import fixMaireRennes from '../lib/admin-handlers/fix-maire-rennes.js';
import fixMismatchedQuestions from '../lib/admin-handlers/fix-mismatched-questions.js';
import generateQuestions from '../lib/admin-handlers/generate-questions.js';
import pregenerateAllQuestions from '../lib/admin-handlers/pregenerate-all-questions.js';
import pregenerateStatus from '../lib/admin-handlers/pregenerate-status.js';
import regenerateCommune from '../lib/admin-handlers/regenerate-commune.js';
import regeneratePositions from '../lib/admin-handlers/regenerate-positions.js';
import regenerateQuestions from '../lib/admin-handlers/regenerate-questions.js';
import searchCandidats from '../lib/admin-handlers/search-candidats.js';

/**
 * Consolidated admin handler
 * Routes requests based on ?action= parameter
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Get action from query parameter
  const { action } = req.query;

  if (!action) {
    return res.status(400).json({
      success: false,
      error: 'Missing action parameter',
      available_actions: [
        'stats', 'candidats', 'submissions', 'candidat', 'validate', 'view-submission',
        'add-candidats-manually', 'add-commune', 'update-commune',
        'check-commune-candidats', 'check-questions', 'cleanup-fake-candidats',
        'delete-questions', 'diagnostic', 'fill-missing-profiles',
        'fix-maire-rennes', 'fix-mismatched-questions', 'generate-questions',
        'pregenerate-all-questions', 'pregenerate-status', 'regenerate-commune',
        'regenerate-positions', 'regenerate-questions', 'search-candidats'
      ]
    });
  }

  // Route to appropriate handler
  const handlers = {
    'stats': stats,
    'candidats': candidats,
    'submissions': submissions,
    'candidat': candidat,
    'validate': validate,
    'view-submission': viewSubmission,
    'add-candidats-manually': addCandidatsManually,
    'add-commune': addCommune,
    'update-commune': updateCommune,
    'check-commune-candidats': checkCommuneCandidats,
    'check-questions': checkQuestions,
    'cleanup-fake-candidats': cleanupFakeCandidats,
    'delete-questions': deleteQuestions,
    'diagnostic': diagnostic,
    'fill-missing-profiles': fillMissingProfiles,
    'fix-maire-rennes': fixMaireRennes,
    'fix-mismatched-questions': fixMismatchedQuestions,
    'generate-questions': generateQuestions,
    'pregenerate-all-questions': pregenerateAllQuestions,
    'pregenerate-status': pregenerateStatus,
    'regenerate-commune': regenerateCommune,
    'regenerate-positions': regeneratePositions,
    'regenerate-questions': regenerateQuestions,
    'search-candidats': searchCandidats
  };

  const selectedHandler = handlers[action];

  if (!selectedHandler) {
    return res.status(404).json({
      success: false,
      error: `Unknown action: ${action}`,
      available_actions: Object.keys(handlers)
    });
  }

  // Call the selected handler
  try {
    return await selectedHandler.default(req, res);
  } catch (error) {
    console.error(`Error in admin action ${action}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
