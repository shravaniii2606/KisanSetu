const express = require('express');
const router = express.Router();
const { getAllTransactions, getFarmerTransactionHistory, createFarmerTransaction } = require('../controllers/farmerTransactionsController');

router.get('/', getAllTransactions);
router.get('/:aadhar', getFarmerTransactionHistory);
router.post('/', createFarmerTransaction);

module.exports = router;