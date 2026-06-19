const express = require('express');
const multer = require('multer');
const { generateBagQRCodes, decodeQRCode } = require('../controllers/qrController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', generateBagQRCodes);
router.post('/decode', upload.single('image'), decodeQRCode);

module.exports = router;
