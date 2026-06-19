const { getSupabaseClient } = require('../supabase');

const batchesTable = process.env.SUPABASE_BATCHES_TABLE || 'batches';
const farmersTable = process.env.SUPABASE_FARMERS_TABLE || 'farmer_records';

function getErrorMessage(error) {
  const causeMessage = error.cause?.message || error.cause?.code || null;
  return [error.message, causeMessage].filter(Boolean).join(' | ') || 'Unknown server error';
}
function getCurrentSeason() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 6 && month <= 10) return 'Kharif';
  if (month >= 11 || month <= 3) return 'Rabi';
  return 'Zaid';
}
async function getBagById(req, res) {
  try {
    const { bagId } = req.params;
    if (!bagId) {
      return res.status(400).json({ error: 'Bag ID is required.' });
    }

    const supabase = getSupabaseClient();
    const { data: batches, error: findError } = await supabase
      .from(batchesTable)
      .select('*');

    if (findError) {
      return res.status(500).json({ error: findError.message });
    }

    const batch = (batches || []).find((b) =>
      (Array.isArray(b.bag_ids) && b.bag_ids.includes(bagId)) ||
      (Array.isArray(b.qr_codes) && b.qr_codes.some(q => q?.bagId === bagId))
    );

    if (!batch) {
      return res.status(404).json({ error: 'Bag not found' });
    }

    const matchingQr = (batch.qr_codes || []).find(q => q?.bagId === bagId);
    const aadhar = matchingQr?.aadhar || null;
    const status = matchingQr?.status || null;

    return res.status(200).json({
      id: bagId,
      product_name: batch.product_name || null,
      bag_weight: batch.bag_weight || null,
      batch_number: batch.batch_number || null,
      aadhar: aadhar,
      status: status
    });
  } catch (error) {
    console.error('Get bag by ID failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

async function purchaseBag(req, res) {
  try {
    const { bagId } = req.params;
    const { farmer_aadhar } = req.body;

    if (!bagId) {
      return res.status(400).json({ error: 'Bag ID is required.' });
    }
    if (!farmer_aadhar) {
      return res.status(400).json({ error: 'Farmer Aadhar is required.' });
    }

    const supabase = getSupabaseClient();

    // 1. Find the batch containing the bag
    const { data: batches, error: findError } = await supabase
      .from(batchesTable)
      .select('*');

    if (findError) {
      return res.status(500).json({ error: findError.message });
    }

    const batch = (batches || []).find((b) =>
      (Array.isArray(b.bag_ids) && b.bag_ids.includes(bagId)) ||
      (Array.isArray(b.qr_codes) && b.qr_codes.some(q => q?.bagId === bagId))
    );

    if (!batch) {
      return res.status(404).json({ error: 'Bag not found' });
    }

    // 2. Find the farmer record
    const { data: farmer, error: farmerError } = await supabase
      .from(farmersTable)
      .select('*')
      .eq('aadhar_id', farmer_aadhar)
      .single();

    if (farmerError) {
      if (farmerError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Farmer not found' });
      }
      return res.status(500).json({ error: farmerError.message });
    }



    // 4. Update the batch's qr_codes array to save the purchased info
    const updatedQrCodes = (batch.qr_codes || []).map((qr) => {
      if (qr && qr.bagId === bagId) {
        return { ...qr, aadhar: farmer_aadhar, status: 'sold' };
      }
      return qr;
    });

    const { error: batchUpdateError } = await supabase
      .from(batchesTable)
      .update({ qr_codes: updatedQrCodes })
      .eq('id', batch.id);

    if (batchUpdateError) {
      return res.status(500).json({ error: batchUpdateError.message });
    }
    const rawWeight = batch.bag_weight || '';
const parsedWeight = parseInt(rawWeight.replace(/[^0-9]/g, ''), 10) || 0;

// Insert into farmer_transactions
const { data: txData, error: txError } = await supabase
  .from('farmer_transactions')
  .insert([{
    farmer_aadhar_card_id: farmer_aadhar,
    dealer_name:           farmer.name ? null : null, // dealer name not available here, set via req.body if needed
    fertilizer_name:       batch.product_name || null,
    batch_number:          batch.batch_number || null,
    bag_id:                bagId,
    quantity_kg:           parsedWeight,
    season:                getCurrentSeason(),
  }]);

if (txError) {
  console.error('farmer_transactions insert failed:', txError.message);
} else {
  console.log('farmer_transactions insert success');
}



    // Insert purchase record into history
    const { data: recordData, error: recordError } = await supabase
      .from('dealer_scan_records')
      .insert([
        {
          decoded_text: JSON.stringify({ bagId, farmer_aadhar }),
          decoded_payload: { bagId, farmer_aadhar },
          bag_id: bagId,
          batch_number: batch.batch_number || null,
          product_name: batch.product_name || null,
          bag_weight: batch.bag_weight || null,
          status: 'sold',
          scanned_at: new Date().toISOString(),
          // ── farmer details ──
          farmer_aadhar_id: farmer_aadhar,
          farmer_name: farmer.name || null,
          farmer_village: farmer.village || null,
          farmer_district: farmer.district || null,
        }
      ])
      .select()
      .single();
    if (recordError) {
      console.error('Failed to insert scan record:', recordError);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Purchase bag failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

module.exports = {
  getBagById,
  purchaseBag
};
