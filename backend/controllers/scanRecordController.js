const { getSupabaseClient } = require('../supabase');

const scanRecordsTable = process.env.SUPABASE_SCAN_RECORDS_TABLE || 'dealer_scan_records';
const batchesTable = process.env.SUPABASE_BATCHES_TABLE || 'batches';

function parseDecodedPayload(decodedText) {
  if (!decodedText || typeof decodedText !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(decodedText);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeScanRecordPayload(body) {
  const decodedText = typeof body.decodedText === 'string' ? body.decodedText.trim() : '';
  const decodedPayload = body.decodedPayload && typeof body.decodedPayload === 'object'
    ? body.decodedPayload
    : parseDecodedPayload(decodedText);
  const batch = body.batch && typeof body.batch === 'object' ? body.batch : {};

  const number_of_bags = Number.isInteger(batch.number_of_bags) ? batch.number_of_bags : null;
  const manufacturer = batch.manufacturer || decodedPayload.manufacturer || body.manufacturer || null;
  const bag_weight = batch.bag_weight || decodedPayload.bagWeight || body.bagWeight || null;
  const matched_batch_id = batch.id || null;
  const status = body.status || null;
  const changed = typeof body.changed === 'boolean' ? body.changed : null;
  const dealer_id = body.dealer_id || null;
  const dealer_name = body.dealer_name || null;

  return {
    decoded_text: decodedText,
    decoded_payload: decodedPayload,
    bag_id: decodedPayload.bagId || body.bagId || null,
    batch_number: batch.batch_number || decodedPayload.batchNumber || body.batchNumber || null,
    product_name: batch.product_name || decodedPayload.productName || body.productName || null,
    number_of_bags,
    manufacturer,
    bag_weight,
    matched_batch_id,
    status,
    changed,
    dealer_id,
    dealer_name,
  };
}

async function createScanRecord(req, res) {
  try {
    const payload = normalizeScanRecordPayload(req.body);

    if (!payload.decoded_text) {
      return res.status(400).json({ error: 'Decoded scan text is required.' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(scanRecordsTable)
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ scanRecord: data });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    console.error('Create scan record failed:', error);
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}

async function listScanRecords(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(scanRecordsTable)
      .select('*')
      .order('scanned_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ scanRecords: data });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    console.error('List scan records failed:', error);
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}
async function getTotalBagsScanned(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(batchesTable)
      .select('qr_codes');

    if (error) return res.status(500).json({ error: error.message });

    const total = (data || []).reduce((sum, batch) => {
      const qrCodes = Array.isArray(batch.qr_codes) ? batch.qr_codes : [];
      return sum + qrCodes.filter((qrCode) => {
        const status = qrCode?.status === 'receive' ? 'received' : qrCode?.status;
        return status === 'received' || status === 'sold';
      }).length;
    }, 0);

    return res.status(200).json({ total });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}
async function getTotalBagsSold(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(batchesTable)
      .select('qr_codes');

    if (error) return res.status(500).json({ error: error.message });

    const total = (data || []).reduce((sum, batch) => {
      const qrCodes = Array.isArray(batch.qr_codes) ? batch.qr_codes : [];
      return sum + qrCodes.filter((qrCode) => qrCode?.status === 'sold').length;
    }, 0);

    return res.status(200).json({ total });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}

module.exports = {
  createScanRecord,
  listScanRecords,
  getTotalBagsScanned,
  getTotalBagsSold,  // ← ADD THIS
};
