const { getSupabaseClient } = require('../supabase');

const batchesTable = process.env.SUPABASE_BATCHES_TABLE || 'batches';

function getErrorMessage(error) {
  const causeMessage = error.cause?.message || error.cause?.code || null;

  if (causeMessage?.includes('ENOTFOUND') || error.message?.includes('ENOTFOUND')) {
    return 'Supabase host could not be found. Check backend/.env SUPABASE_URL and make sure it matches your Supabase Project URL.';
  }

  return [error.message, causeMessage].filter(Boolean).join(' | ') || 'Unknown server error';
}

function normalizeBatchPayload(body) {
  const numberOfBags = Number.parseInt(body.numberOfBags, 10);
  const productPrice = body.productPrice === '' || body.productPrice === undefined
    ? null
    : Number.parseFloat(body.productPrice);

  return {
    batch_number: body.batchNumber?.trim() || null,
    number_of_bags: numberOfBags,
    product_name: body.productName?.trim() || null,
    product_price: Number.isFinite(productPrice) ? productPrice : null,
    product_expiry: body.productExpiry || null,
    manufacturer: body.manufacturer?.trim() || null,
    bag_weight: body.bagWeight?.trim() || null,
    bag_ids: Array.isArray(body.bagIds) ? body.bagIds : [],
    qr_codes: Array.isArray(body.qrCodes)
      ? body.qrCodes.map((qrCode) => ({ ...qrCode, status: null }))
      : [],
    batch_qr_code: body.batchQrCode || null,
  };
}


function normalizeBagId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function createBatch(req, res) {
  try {
    const payload = normalizeBatchPayload(req.body);

    if (!payload.batch_number) {
      return res.status(400).json({ error: 'Batch number is required.' });
    }

    if (!Number.isInteger(payload.number_of_bags) || payload.number_of_bags <= 0) {
      return res.status(400).json({ error: 'A valid number of bags is required.' });
    }

    if (payload.bag_ids.length !== payload.number_of_bags) {
      return res.status(400).json({ error: 'Bag IDs count must match the number of bags.' });
    }

    if (payload.qr_codes.length > 0 && payload.qr_codes.length !== payload.number_of_bags) {
      return res.status(400).json({ error: 'QR codes count must match the number of bags.' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(batchesTable)
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ batch: data });
  } catch (error) {
    console.error('Create batch failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function listBatches(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(batchesTable)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ batches: data });
  } catch (error) {
    console.error('List batches failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function scanBatchBag(req, res) {
  try {
    const bagId = req.body.bagId?.trim();
    const batchNumber = req.body.batchNumber?.trim();
    const scannedBy = (req.body.scannedBy || req.body.role || 'dealer').toLowerCase();

    if (!bagId && !batchNumber) {
      return res.status(400).json({ error: 'Bag ID or Batch Number is required.' });
    }

    if (!['gov', 'dealer'].includes(scannedBy)) {
      return res.status(400).json({ error: 'Scanner role must be gov or dealer.' });
    }

    const supabase = getSupabaseClient();

    if (batchNumber) {
      // Dealer batch scan
      const { data: batches, error: findError } = await supabase
        .from(batchesTable)
        .select('*')
        .eq('batch_number', batchNumber);

      if (findError) {
        return res.status(500).json({ error: findError.message });
      }

      const batch = batches?.[0];
      if (!batch) {
        return res.status(404).json({ error: `No batch found for Batch Number ${batchNumber}.` });
      }

      if (scannedBy === 'gov') {
        const qrCodes = batch.qr_codes || [];
        const allSentOrReceived = qrCodes.every(qr => qr && (qr.status === 'sent' || qr.status === 'received'));
        if (allSentOrReceived) {
          return res.status(200).json({
            batchNumber: batch.batch_number,
            status: 'sent',
            changed: false,
            message: 'Batch already sent.',
          });
        }

        let changed = false;
        const updatedQrCodes = qrCodes.map(qr => {
          if (qr && qr.status === null) {
            changed = true;
            return { ...qr, status: 'sent' };
          }
          return qr;
        });

        if (changed) {
          const { error: updateError } = await supabase
            .from(batchesTable)
            .update({ qr_codes: updatedQrCodes })
            .eq('id', batch.id);
          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }
        }

        return res.status(200).json({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          number_of_bags: batch.qr_codes ? batch.qr_codes.length : null,
          status: 'sent',
          changed,
          message: 'All bags in the batch have been marked as sent.',
        });
      } else {
        const qrCodes = batch.qr_codes || [];

        // If any bag status is null, cannot receive
        const hasNull = qrCodes.some(qr => qr && qr.status === null);
        if (hasNull) {
          return res.status(400).json({ error: 'Batch contains bags with null status; cannot receive before sent.' });
        }

        const allReceived = qrCodes.every(qr => qr && qr.status === 'received');
        if (allReceived) {
          // Still save scan record for the dealer
          await supabase
            .from('dealer_scan_records')
            .insert([{
              decoded_text: JSON.stringify({ batchNumber: batch.batch_number }),
              decoded_payload: { batchNumber: batch.batch_number },
              bag_id: null,
              batch_number: batch.batch_number,
              product_name: batch.product_name || null,
              number_of_bags: batch.qr_codes ? batch.qr_codes.length : null,
              manufacturer: batch.manufacturer || null,
              bag_weight: batch.bag_weight || null,
              matched_batch_id: batch.id,
              dealer_name: req.body.dealer_name || null,
              location: req.body.location || null,
              status: 'received',
              changed: false,
            }]);

          return res.status(200).json({
            batchNumber: batch.batch_number,
            status: 'received',
            changed: false,
            message: 'Batch already received.',
          });
        }

        // Update all bags with status 'sent' to 'received'
        let changed = false;
        const updatedQrCodes = qrCodes.map(qr => {
          if (qr && qr.status === 'sent') {
            changed = true;
            return { ...qr, status: 'received' };
          }
          return qr;
        });

        if (changed) {
          const { error: updateError } = await supabase
            .from(batchesTable)
            .update({ qr_codes: updatedQrCodes })
            .eq('id', batch.id);
          if (updateError) {
            return res.status(500).json({ error: updateError.message });
          }
        }

        // Always write to dealer_scan_records for every dealer scan
        const scanRecordPayload = {
          decoded_text: JSON.stringify({ batchNumber: batch.batch_number }),
          decoded_payload: { batchNumber: batch.batch_number },
          bag_id: null,
          batch_number: batch.batch_number,
          product_name: batch.product_name || null,
          number_of_bags: batch.qr_codes ? batch.qr_codes.length : null,
          manufacturer: batch.manufacturer || null,
          bag_weight: batch.bag_weight || null,
          matched_batch_id: batch.id,
          dealer_name: req.body.dealer_name || null,
          location: req.body.location || null,
          status: 'received',
          changed,
        };

        await supabase
          .from('dealer_scan_records')
          .insert([scanRecordPayload]);

        return res.status(200).json({
          batchId: batch.id,
          batchNumber: batch.batch_number,
          number_of_bags: batch.qr_codes ? batch.qr_codes.length : null,
          status: 'received',
          changed,
          message: changed ? 'All bags in the batch have been marked as received.' : 'Batch already received.',
        });
      }
    }

    // Continue with bagId handling...

    const { data: batches, error: findError } = await supabase
      .from(batchesTable)
      .select('*');

    if (findError) {
      return res.status(500).json({ error: findError.message });
    }

    const batch = (batches || []).find((currentBatch) => (
      (currentBatch.qr_codes || []).some((qrCode) => qrCode?.bagId === bagId)
    ));

    if (!batch) {
      return res.status(404).json({ error: `No batch found for bag ID ${bagId}.` });
    }

    let changed = false;
    let currentStatus = null;
    let nextStatus = null;
    const updatedQrCodes = (batch.qr_codes || []).map((qrCode) => {
      if (qrCode?.bagId !== bagId) {
        return qrCode;
      }

      currentStatus = qrCode.status ?? null;
      const normalizedStatus = currentStatus === 'receive' ? 'received' : currentStatus;

      if (scannedBy === 'gov') {
        if (normalizedStatus !== null) {
          nextStatus = normalizedStatus;
          return qrCode;
        }

        changed = true;
        nextStatus = 'sent';
        return {
          ...qrCode,
          status: nextStatus,
        };
      }

      if (normalizedStatus !== 'sent') {
        nextStatus = normalizedStatus;
        return qrCode;
      }

      changed = true;
      nextStatus = 'received';
      return {
        ...qrCode,
        status: nextStatus,
      };
    });

    if (scannedBy === 'gov' && currentStatus !== null) {
      return res.status(200).json({
        bagId,
        batchNumber: batch.batch_number,
        status: nextStatus,
        changed: false,
        message: 'Bag already sent.',
      });
    }

    if (scannedBy === 'dealer' && currentStatus === null) {
      return res.status(400).json({
        error: 'Dealer cannot scan a bag whose status is null.',
        bagId,
        batchNumber: batch.batch_number,
        status: currentStatus,
      });
    }

    if (scannedBy === 'dealer' && nextStatus === 'received' && !changed) {
      // Still save scan record for the dealer
      await supabase
        .from('dealer_scan_records')
        .insert([{
          decoded_text: JSON.stringify({ bagId }),
          decoded_payload: { bagId },
          bag_id: bagId,
          batch_number: batch.batch_number,
          product_name: batch.product_name || null,
          number_of_bags: 1,
          manufacturer: batch.manufacturer || null,
          bag_weight: batch.bag_weight || null,
          matched_batch_id: batch.id,
          dealer_name: req.body.dealer_name || null,
          location: req.body.location || null,
          status: 'received',
          changed: false,
        }]);

      return res.status(200).json({
        bagId,
        batchNumber: batch.batch_number,
        status: nextStatus,
        changed: false,
        message: 'Bag received already.',
      });
    }

    if (scannedBy === 'dealer' && nextStatus !== 'received' && nextStatus !== 'sent') {
      return res.status(400).json({
        error: `Bag ID ${bagId} has unsupported status "${currentStatus}".`,
        bagId,
        batchNumber: batch.batch_number,
        status: currentStatus,
      });
    }

    if (changed) {
      const { error: updateError } = await supabase
        .from(batchesTable)
        .update({ qr_codes: updatedQrCodes })
        .eq('id', batch.id);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }
    }

    if (scannedBy === 'dealer') {
      // Always write to dealer_scan_records for every dealer scan
      const scanRecordPayload = {
        decoded_text: JSON.stringify({ bagId }),
        decoded_payload: { bagId },
        bag_id: bagId,
        batch_number: batch.batch_number,
        product_name: batch.product_name || null,
        number_of_bags: 1,
        manufacturer: batch.manufacturer || null,
        bag_weight: batch.bag_weight || null,
        matched_batch_id: batch.id,
        dealer_name: req.body.dealer_name || null,
        location: req.body.location || null,
        status: nextStatus,
        changed,
      };

      await supabase
        .from('dealer_scan_records')
        .insert([scanRecordPayload]);
    }

        return res.status(200).json({
          bagId,
          batchId: batch.id,
          batchNumber: batch.batch_number,
          status: nextStatus,
          changed,
          message: scannedBy === 'gov'
            ? 'Status changed from null to sent.'
            : 'Status changed from sent to received.',
        });
  } catch (error) {
    console.error('Scan batch bag failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function markBagSent(req, res) {
  try {
    const bagId = normalizeBagId(req.body.bagId);

    if (!bagId) {
      return res.status(400).json({ error: 'Bag ID is required.' });
    }

    const supabase = getSupabaseClient();
    const { data: batches, error: fetchError } = await supabase
      .from(batchesTable)
      .select('*')
      .contains('bag_ids', [bagId])
      .limit(1);

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    const batch = batches?.[0];

    if (!batch) {
      return res.status(404).json({ error: 'No batch found for this bag ID.' });
    }

    const currentQRCodes = Array.isArray(batch.qr_codes) ? batch.qr_codes : [];
    const matchingQRCode = currentQRCodes.find((qrCode) => qrCode?.bagId === bagId);
    const currentStatus = matchingQRCode?.status ?? null;

    if (currentStatus === 'sent') {
      return res.status(200).json({
        bagId,
        batchNumber: batch.batch_number,
        status: currentStatus,
        changed: false,
        message: 'This bag was already marked as sent.',
      });
    }

    if (currentStatus !== null) {
      return res.status(200).json({
        bagId,
        batchNumber: batch.batch_number,
        status: currentStatus,
        changed: false,
        message: `This bag already has status "${currentStatus}".`,
      });
    }

    const nextQRCodes = matchingQRCode
      ? currentQRCodes.map((qrCode) => (
        qrCode?.bagId === bagId
          ? { ...qrCode, status: 'sent' }
          : qrCode
      ))
      : [...currentQRCodes, { bagId, status: 'sent' }];

    const { data: updatedBatch, error: updateError } = await supabase
      .from(batchesTable)
      .update({ qr_codes: nextQRCodes })
      .eq('id', batch.id)
      .select('*')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      bagId,
      batchNumber: updatedBatch.batch_number,
      status: 'sent',
      changed: true,
      message: 'Bag marked as sent.',
    });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    console.error('Mark bag sent failed:', error);
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}

module.exports = {
  createBatch,
  listBatches,
  markBagSent,
  scanBatchBag,
};
