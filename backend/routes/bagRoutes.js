const express = require('express');
const { getBagById, purchaseBag } = require('../controllers/bagController');

const router = express.Router();

router.get('/:bagId', getBagById);
router.post('/:bagId/purchase', purchaseBag);

module.exports = router;
