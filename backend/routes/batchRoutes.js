const express = require('express');
const { createBatch, listBatches, scanBatchBag } = require('../controllers/batchController');

const router = express.Router();

router.get('/', listBatches);
router.post('/', createBatch);
router.post('/scan', scanBatchBag);

module.exports = router;

