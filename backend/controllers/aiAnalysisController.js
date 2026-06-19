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

async function runAIAnalysis(req, res) {
  try {
    const supabase = getSupabaseClient();

    // 1. Fetch all transactions
    const { data: transactions, error: txError } = await supabase
      .from('farmer_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (txError) return res.status(500).json({ error: txError.message });

    // 2. Group by farmer
    const byFarmer = {};
    for (const tx of transactions) {
      const id = tx.farmer_aadhar_card_id;
      if (!byFarmer[id]) byFarmer[id] = [];
      byFarmer[id].push(tx);
    }

    // 3. Fetch farmer details + limits
    const farmerIds = Object.keys(byFarmer);
    const farmerProfiles = await Promise.all(farmerIds.map(async (aadhar) => {
      const [farmerRes, landRes, cropRes] = await Promise.all([
        supabase.from('farmer_records').select('name, district, village').eq('aadhar_id', aadhar).single(),
        supabase.from('land_records').select('land_area').eq('aadhar_id', aadhar),
        supabase.from('crop_records').select('crop_types').eq('aadhar_id', aadhar),
      ]);
      const limit = calculateLimit(landRes.data || [], cropRes.data || []);
      const txList = byFarmer[aadhar];
      const totalKg = txList.reduce((s, t) => s + (t.quantity_kg || 0), 0);
      const uniqueDealers = new Set(txList.map(t => t.dealer_name).filter(Boolean)).size;
      const txCount = txList.length;
      return {
        aadhar,
        name: farmerRes.data?.name || 'Unknown',
        district: farmerRes.data?.district || 'Unknown',
        limit,
        totalKg,
        txCount,
        uniqueDealers,
        transactions: txList,
      };
    }));

    // 4. Build prompt for OpenRouter
    const farmerSummary = farmerProfiles.map(f =>
      `Farmer ${f.name} (${f.aadhar}), District: ${f.district}, Limit: ${f.limit}kg, Purchased: ${f.totalKg}kg, Transactions: ${f.txCount}, Unique dealers: ${f.uniqueDealers}`
    ).join('\n');

    const prompt = `You are an AI fraud detection system for India's fertilizer subsidy distribution program.

Farmer transaction data:
${farmerSummary}

Flag ONLY the following genuinely suspicious patterns:

1. LIMIT_EXCEEDED — Farmer purchased more than their calculated seasonal limit (based on land area and crops). This is the most serious fraud indicator.

2. MULTI_DEALER_BYPASS — Farmer bought from 3 or more different dealers in the same season. This is a known tactic to bypass per-dealer purchase limits.

3. GHOST_FARMER — Farmer has transactions but no land records or crop records in the system. Suggests a fake or unverified farmer identity.

4. BULK_HOARDING — Single transaction quantity is more than 80% of the farmer's total seasonal limit. Suggests stockpiling for resale on black market.

5. DISTRICT_ANOMALY — Farmer's total purchase is more than 3x the average purchase of other farmers in the same district. Suggests abnormal consumption or diversion.

Be strict — only flag clear violations. Normal farmers making 2-4 purchases across a season is expected behavior.

Return ONLY a JSON array, no explanation:
[
  {
    "farmer_aadhar": "aadhar_id",
    "farmer_name": "name",
    "district": "district",
    "alert_type": "limit_exceeded|multi_dealer_bypass|ghost_farmer|bulk_hoarding|district_anomaly",
    "message": "specific explanation with numbers e.g. Purchased 280kg against 225kg limit",
    "severity": "High|Medium|Low"
  }
]

If no violations found, return: []`;

    // 5. Call OpenRouter API
    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Fertilizer Distribution Monitor',
      },
      body: JSON.stringify({
        model: 'poolside/laguna-m.1:free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!openRouterRes.ok) {
      const err = await openRouterRes.json();
      return res.status(500).json({ error: err.error?.message || 'OpenRouter API failed' });
    }

    const aiResponse = await openRouterRes.json();
    const rawContent = aiResponse.choices?.[0]?.message?.content || '[]';

    // 6. Parse AI response
    let alerts = [];
    try {
      const clean = rawContent.replace(/```json|```/g, '').trim();
      alerts = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse AI response:', rawContent);
      return res.status(500).json({ error: 'AI returned invalid JSON' });
    }

    if (alerts.length === 0) {
      return res.status(200).json({ message: 'No anomalies detected', alerts: [] });
    }

    // 7. Save alerts to Supabase (avoid duplicates by clearing old ones first)
    await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const { data: savedAlerts, error: alertError } = await supabase
      .from('alerts')
      .insert(alerts.map(a => ({
        farmer_aadhar: a.farmer_aadhar,
        farmer_name:   a.farmer_name,
        district:      a.district,
        alert_type:    a.alert_type,
        message:       a.message,
        severity:      a.severity,
        status:        'Open',
      })))
      .select();

    if (alertError) return res.status(500).json({ error: alertError.message });

    return res.status(200).json({ alerts: savedAlerts, count: savedAlerts.length });
  } catch (error) {
    console.error('AI analysis failed:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getAlerts(req, res) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ alerts: data || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { runAIAnalysis, getAlerts };