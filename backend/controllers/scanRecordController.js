const { getSupabaseClient } = require('../supabase');

const scanRecordsTable = process.env.SUPABASE_SCAN_RECORDS_TABLE || 'dealer_scan_records';

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
  const location = body.location || null;

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
    location,
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
    // Allow optional filtering by dealer_id and status (defaults to both received and sold)
    const dealerId = req.query.dealer_id || null;
    const statusFilter = req.query.status || 'received,sold';

    let query = supabase.from(scanRecordsTable).select('number_of_bags');
    if (dealerId) query = query.eq('dealer_id', dealerId);
    if (statusFilter) {
      const statusValues = statusFilter.split(',').map((status) => status.trim()).filter(Boolean);
      if (statusValues.length === 1) {
        query = query.eq('status', statusValues[0]);
      } else if (statusValues.length > 1) {
        query = query.in('status', statusValues);
      }
    }

    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    const total = data.reduce((sum, row) => {
      const n = row && (row.number_of_bags === null || row.number_of_bags === undefined)
        ? 1
        : Number(row.number_of_bags) || 0;
      return sum + n;
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
    const dealerId = req.query.dealer_id || null;
    let query = supabase.from(scanRecordsTable).select('id').eq('status', 'sold');
    if (dealerId) query = query.eq('dealer_id', dealerId);
    const { data, error } = await query;

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ total: data.length });
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
