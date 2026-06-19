const { getSupabaseClient } = require('../supabase');

const farmersTable = process.env.SUPABASE_FARMERS_TABLE || 'farmer_records';

async function listFarmers(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(farmersTable)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ farmers: data || [] });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    console.error('List farmers failed:', error);
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}

async function getFarmerByAadhar(req, res) {
  try {
    const { aadhar } = req.params;
    if (!aadhar) {
      return res.status(400).json({ error: 'Aadhar parameter is required' });
    }
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(farmersTable)
      .select('*')
      .eq('aadhar_id', aadhar)
      .single();
    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'Farmer not found' });
      }
      return res.status(500).json({ error: error.message });
    }
    // Normalize the aadhar field name for the frontend
    const farmer = { ...data, aadhar: data.aadhar_id };
    return res.status(200).json({ farmer });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    console.error('Get farmer by Aadhar failed:', error);
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}
async function getFarmerCount(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(farmersTable)
      .select('aadhar_id');

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ count: data.length });
  } catch (error) {
    const causeMessage = error.cause?.message || error.cause?.code || null;
    const details = [error.message, causeMessage].filter(Boolean).join(' | ');
    return res.status(500).json({ error: details || 'Unknown server error' });
  }
}
module.exports = {
  listFarmers,
  getFarmerByAadhar,
  getFarmerCount,
};
