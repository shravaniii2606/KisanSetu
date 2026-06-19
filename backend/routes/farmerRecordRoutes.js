const express = require('express');
const {
  getFarmerRecordMetrics,
  listAllFarmers,
  getFarmerDetails,
  updateFarmerPhone,
} = require('../controllers/farmerRecordController');

const router = express.Router();

router.get('/metrics', getFarmerRecordMetrics);
router.get('/', listAllFarmers);
router.get('/:aadhar', getFarmerDetails);
router.put('/:aadhar/phone', updateFarmerPhone);

module.exports = router;
