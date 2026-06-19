const QRCode = require('qrcode');

async function generateBagQRCodes(req, res) {
  try {
    const { bagIds, batchNumber, productName, manufacturer, bagWeight, numberOfBags, productPrice, productExpiry } = req.body;

    if (!Array.isArray(bagIds) || bagIds.length === 0) {
      return res.status(400).json({ error: 'bagIds must be a non-empty array.' });
    }

    const qrCodes = await Promise.all(
      bagIds.map(async (bagId) => {
        const qrPayload = JSON.stringify({
          bagId,
          batchNumber: batchNumber || null,
          productName: productName || null,
          manufacturer: manufacturer || null,
          bagWeight: bagWeight || null,
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: 'M',
          margin: 4,
          width: 220,
        });

        return {
          bagId,
          status: null,
          qrCodeDataUrl,
        };
      })
    );

    // Generate Batch QR Code
    const batchQrPayload = JSON.stringify({
      batchNumber: batchNumber || null,
      numberOfBags: numberOfBags || bagIds.length,
      productName: productName || null,
      productPrice: productPrice || null,
      productExpiry: productExpiry || null,
      manufacturer: manufacturer || null,
      bagWeight: bagWeight || null,
    });

    const batchQrCodeDataUrl = await QRCode.toDataURL(batchQrPayload, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 220,
    });

    return res.status(200).json({ qrCodes, batchQrCodeDataUrl });
  } catch (error) {
    console.error('Generate QR codes failed:', error);
    return res.status(500).json({ error: error.message || 'Unable to generate QR codes.' });
  }
}
const { Jimp } = require('jimp');
const jsQR = require('jsqr');

async function decodeQRCode(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const image = await Jimp.fromBuffer(req.file.buffer);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = new Uint8ClampedArray(image.bitmap.data);

    const code = jsQR(data, width, height, {
      inversionAttempts: 'dontInvert',
    });

    if (!code) {
      const code2 = jsQR(data, width, height, {
        inversionAttempts: 'onlyInvert',
      });
      if (!code2) {
        return res.status(404).json({ error: 'No QR code found in image.' });
      }
      return res.status(200).json({ decodedText: code2.data });
    }

    return res.status(200).json({ decodedText: code.data });
  } catch (error) {
    console.error('Decode QR failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to decode QR.' });
  }
}
module.exports = {
  generateBagQRCodes,
  decodeQRCode,
};


