const express = require('express');
const router = express.Router();
const { runAIAnalysis, getAlerts } = require('../controllers/aiAnalysisController');

router.post('/run', runAIAnalysis);
router.get('/alerts', getAlerts);

module.exports = router;