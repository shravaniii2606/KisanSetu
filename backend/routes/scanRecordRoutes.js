const express = require('express');
const router = express.Router();
const { 
  createScanRecord, 
  listScanRecords, 
  getTotalBagsScanned,
  getTotalBagsSold 
} = require('../controllers/scanRecordController');

router.get('/total-bags', getTotalBagsScanned);
router.get('/total-sold', getTotalBagsSold);
router.get('/', listScanRecords);
router.post('/', createScanRecord);

module.exports = router;