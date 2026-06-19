const { getSupabaseClient } = require('../supabase');

const FERTILIZER_REQUIREMENTS = {
  Wheat: 50,
  Mustard: 40,
  Paddy: 60,
  Soybean: 35,
  Maize: 55,
  Sunflower: 45,
};

function calculateLimit(landRecords, cropRecords) {
  const totalLandArea = landRecords.reduce((sum, l) => sum + (l.land_area || 0), 0);
  const allCrops = cropRecords.flatMap(c => c.crop_types || []);
  const totalPerAcre = allCrops.reduce((sum, crop) => {
    return sum + (FERTILIZER_REQUIREMENTS[crop] ?? 40); // 40 = default fallback
  }, 0);
  return Math.round(totalLandArea * totalPerAcre);
}
function getErrorMessage(error) {
  const causeMessage = error.cause?.message || error.cause?.code || null;
  if (causeMessage?.includes('ENOTFOUND') || error.message?.includes('ENOTFOUND')) {
    return 'Supabase host could not be found. Check backend/.env SUPABASE_URL.';
  }
  return [error.message, causeMessage].filter(Boolean).join(' | ') || 'Unknown server error';
}

// GET /api/farmer-records/metrics
async function getFarmerRecordMetrics(req, res) {
  try {
    const supabase = getSupabaseClient();

    const { count: totalFarmers, error: totalError } = await supabase
      .from('farmer_records')
      .select('aadhar_id', { count: 'exact', head: true });

    if (totalError) {
      return res.status(500).json({ error: totalError.message });
    }

    return res.status(200).json({
      totalFarmers: totalFarmers || 0,
      activeFarmers: totalFarmers || 0,
    });
  } catch (error) {
    console.error('Get farmer record metrics failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// GET /api/farmer-records/
// Returns list of all farmers (basic info only)
async function listAllFarmers(req, res) {
  try {
    const supabase = getSupabaseClient();

    // Fetch farmers + their land and crop data in parallel
    const [farmerRes, landRes, cropRes] = await Promise.all([
      supabase
  .from('farmer_records')
  .select('aadhar_id, name, village, district, created_at, phone')
  .order('created_at', { ascending: false }),
      supabase
        .from('land_records')
        .select('aadhar_id, land_area'),
      supabase
        .from('crop_records')
        .select('aadhar_id, crop_types'),
    ]);

    if (farmerRes.error) return res.status(500).json({ error: farmerRes.error.message });

    // Compute limit for each farmer from their land + crop data
    const farmers = farmerRes.data.map(farmer => {
      const land = (landRes.data || []).filter(l => l.aadhar_id === farmer.aadhar_id);
      const crops = (cropRes.data || []).filter(c => c.aadhar_id === farmer.aadhar_id);
      return {
        ...farmer,
        limit: calculateLimit(land, crops),
      };
    });

    return res.status(200).json({ farmers });
  } catch (error) {
    console.error('List all farmers failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

// GET /api/farmer-records/:aadhar
// Returns full joined detail: farmer + land + crop + soil health
async function getFarmerDetails(req, res) {
  try {
    const { aadhar } = req.params;
    if (!aadhar) {
      return res.status(400).json({ error: 'Aadhar ID parameter is required.' });
    }

    const supabase = getSupabaseClient();

    // Run all four queries in parallel for speed
    const [farmerRes, landRes, cropRes, soilRes] = await Promise.all([
      supabase
        .from('farmer_records')
        .select('aadhar_id, name, village, district, limit, phone')
        .eq('aadhar_id', aadhar)
        .single(),
      supabase
        .from('land_records')
        .select('id, land_area')
        .eq('aadhar_id', aadhar),
      supabase
        .from('crop_records')
        .select('id, season, crop_types')
        .eq('aadhar_id', aadhar),
      supabase
        .from('soilhealth_records')
        .select('id, nitrogen, phosphorus, potassium')
        .eq('aadhar_id', aadhar),
    ]);

    if (farmerRes.error) {
      if (farmerRes.error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Farmer not found.' });
      }
      return res.status(500).json({ error: farmerRes.error.message });
    }

    const land = landRes.data || [];
    const crops = cropRes.data || [];

    const computedLimit = calculateLimit(land, crops);

    return res.status(200).json({
      farmer: { ...farmerRes.data, limit: computedLimit }, // overrides the DB hardcoded limit
      land,
      crops,
      soilHealth: soilRes.data || [],
    });
  } catch (error) {
    console.error('Get farmer details failed:', error);
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}
async function getAllTransactions(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('farmer_transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ transactions: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
async function updateFarmerPhone(req, res) {
  try {
    const { aadhar } = req.params;
    const { phone } = req.body;

    if (!aadhar) return res.status(400).json({ error: 'Aadhar is required.' });
    if (!phone) return res.status(400).json({ error: 'Phone number is required.' });

    // Basic Indian phone validation
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      return res.status(400).json({ error: 'Phone must be 10 digits.' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('farmer_records')
      .update({ phone: cleaned })
      .eq('aadhar_id', aadhar)
      .select('aadhar_id, name, phone')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, farmer: data });
  } catch (error) {
    return res.status(500).json({ error: getErrorMessage(error) });
  }
}

module.exports = {
  getFarmerRecordMetrics,
  listAllFarmers,
  getFarmerDetails,
  updateFarmerPhone,  // ← ADD THIS
};