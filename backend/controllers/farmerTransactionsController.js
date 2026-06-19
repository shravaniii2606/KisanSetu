const { getSupabaseClient } = require('../supabase');

const FERTILIZER_REQUIREMENTS = {
  Wheat: 50, Mustard: 40, Paddy: 60,
  Soybean: 35, Maize: 55, Sunflower: 45,
};

function calculateLimit(landRecords, cropRecords) {
  const totalLand = landRecords.reduce((s, l) => s + (l.land_area || 0), 0);
  const allCrops = cropRecords.flatMap(c => c.crop_types || []);
  const perAcre = allCrops.reduce((s, c) => s + (FERTILIZER_REQUIREMENTS[c] ?? 40), 0);
  return Math.round(totalLand * perAcre) || 100;
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

async function getFarmerTransactionHistory(req, res) {
  try {
    const { aadhar } = req.params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('farmer_transactions')
      .select('*')
      .eq('farmer_aadhar_card_id', aadhar)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ transactions: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createFarmerTransaction(req, res) {
  try {
    const { farmer_aadhar_card_id, dealer_name, fertilizer_name, batch_number, bag_id, quantity_kg } = req.body;

    if (!farmer_aadhar_card_id || !quantity_kg) {
      return res.status(400).json({ error: 'farmer_aadhar_card_id and quantity_kg are required.' });
    }

    const supabase = getSupabaseClient();

    // Check seasonal limit
    const { data: existing, error: txError } = await supabase
      .from('farmer_transactions')
      .select('quantity_kg')
      .eq('farmer_aadhar_card_id', farmer_aadhar_card_id)
      .eq('season', getCurrentSeason());

    if (txError) return res.status(500).json({ error: txError.message });

    const alreadyBought = (existing || []).reduce((s, t) => s + (t.quantity_kg || 0), 0);

    const [landRes, cropRes] = await Promise.all([
      supabase.from('land_records').select('land_area').eq('aadhar_id', farmer_aadhar_card_id),
      supabase.from('crop_records').select('crop_types').eq('aadhar_id', farmer_aadhar_card_id),
    ]);
    const limit = calculateLimit(landRes.data || [], cropRes.data || []);

    if (alreadyBought + Number(quantity_kg) > limit) {
      return res.status(400).json({
        error: `Limit exceeded. Farmer has ${limit - alreadyBought} kg remaining this season.`,
        remaining: limit - alreadyBought,
        limit,
      });
    }

    const { data, error } = await supabase
      .from('farmer_transactions')
      .insert([{
        farmer_aadhar_card_id,
        dealer_name,
        fertilizer_name,
        batch_number,
        bag_id,
        quantity_kg,
        season: getCurrentSeason(),
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ transaction: data, remaining: limit - alreadyBought - Number(quantity_kg) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 10) return 'Kharif';
  if (month >= 11 || month <= 3) return 'Rabi';
  return 'Zaid';
}

module.exports = { getAllTransactions, getFarmerTransactionHistory, createFarmerTransaction };