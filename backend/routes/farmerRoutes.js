const express = require('express');
const { listFarmers, getFarmerByAadhar, getFarmerCount } = require('../controllers/farmerController');

const router = express.Router();

router.get('/', listFarmers);
router.get('/count', getFarmerCount);
router.get('/:aadhar', getFarmerByAadhar);

module.exports = router;
