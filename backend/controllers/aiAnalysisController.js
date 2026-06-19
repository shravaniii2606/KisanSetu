const { getSupabaseClient } = require('../supabase');

const FERTILIZER_REQUIREMENTS = {
  Wheat: 50, Mustard: 40, Paddy: 60,
  Soybean: 35, Maize: 55, Sunflower: 45,
};

const ALERT_TYPES = {
  LIMIT_EXCEEDED: 'limit_exceeded',
  MULTI_DEALER_BYPASS: 'multi_dealer_bypass',
  GHOST_FARMER: 'ghost_farmer',
  BULK_HOARDING: 'bulk_hoarding',
  DISTRICT_ANOMALY: 'district_anomaly',
};

function calculateLimit(landRecords, cropRecords) {
  const totalLand = landRecords.reduce((s, l) => s + (l.land_area || 0), 0);
  const allCrops = cropRecords.flatMap(c => c.crop_types || []);
  const perAcre = allCrops.reduce((s, c) => s + (FERTILIZER_REQUIREMENTS[c] ?? 40), 0);
  return Math.round(totalLand * perAcre) || 100;
}

function buildRuleBasedAlerts(farmerProfiles) {
  const districtTotals = farmerProfiles.reduce((acc, farmer) => {
    if (!acc[farmer.district]) acc[farmer.district] = { totalKg: 0, count: 0 };
    acc[farmer.district].totalKg += farmer.totalKg;
    acc[farmer.district].count += 1;
    return acc;
  }, {});

  const alerts = [];

  for (const farmer of farmerProfiles) {
    if (farmer.totalKg > farmer.limit) {
      alerts.push({
        farmer_aadhar: farmer.aadhar,
        farmer_name: farmer.name,
        district: farmer.district,
        alert_type: ALERT_TYPES.LIMIT_EXCEEDED,
        message: `Purchased ${farmer.totalKg}kg against ${farmer.limit}kg seasonal limit.`,
        severity: 'High',
      });
    }

    if (farmer.uniqueDealers >= 3) {
      alerts.push({
        farmer_aadhar: farmer.aadhar,
        farmer_name: farmer.name,
        district: farmer.district,
        alert_type: ALERT_TYPES.MULTI_DEALER_BYPASS,
        message: `Purchased through ${farmer.uniqueDealers} different dealers in the same season.`,
        severity: 'Medium',
      });
    }

    if (farmer.landRecordCount === 0 && farmer.cropRecordCount === 0) {
      alerts.push({
        farmer_aadhar: farmer.aadhar,
        farmer_name: farmer.name,
        district: farmer.district,
        alert_type: ALERT_TYPES.GHOST_FARMER,
        message: 'Has fertilizer transactions but no land or crop records.',
        severity: 'High',
      });
    }

    const largestTransactionKg = farmer.transactions.reduce((max, tx) => Math.max(max, tx.quantity_kg || 0), 0);
    if (largestTransactionKg > farmer.limit * 0.8) {
      alerts.push({
        farmer_aadhar: farmer.aadhar,
        farmer_name: farmer.name,
        district: farmer.district,
        alert_type: ALERT_TYPES.BULK_HOARDING,
        message: `Largest single purchase was ${largestTransactionKg}kg against ${farmer.limit}kg seasonal limit.`,
        severity: 'Medium',
      });
    }

    const district = districtTotals[farmer.district];
    const peerCount = Math.max((district?.count || 0) - 1, 0);
    const peerAverage = peerCount > 0 ? (district.totalKg - farmer.totalKg) / peerCount : 0;
    if (peerAverage > 0 && farmer.totalKg > peerAverage * 3) {
      alerts.push({
        farmer_aadhar: farmer.aadhar,
        farmer_name: farmer.name,
        district: farmer.district,
        alert_type: ALERT_TYPES.DISTRICT_ANOMALY,
        message: `Purchased ${farmer.totalKg}kg, more than 3x district peer average of ${Math.round(peerAverage)}kg.`,
        severity: 'Medium',
      });
    }
  }

  return alerts;
}

async function getAIAlerts(prompt) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:5000',
      'X-Title': 'Fertilizer Distribution Monitor',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'poolside/laguna-m.1:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!openRouterRes.ok) {
    let message = 'OpenRouter API failed';
    try {
      const err = await openRouterRes.json();
      message = err.error?.message || message;
    } catch (error) {
      message = await openRouterRes.text();
    }
    console.warn('OpenRouter unavailable, using rule-based alerts:', message);
    return null;
  }

  const aiResponse = await openRouterRes.json();
  const rawContent = aiResponse.choices?.[0]?.message?.content || '[]';
  const clean = rawContent.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
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
        landRecordCount: landRes.data?.length || 0,
        cropRecordCount: cropRes.data?.length || 0,
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

    // 5. Use OpenRouter when configured; otherwise keep the dashboard useful with local rules.
    const fallbackAlerts = buildRuleBasedAlerts(farmerProfiles);
    let alerts = fallbackAlerts;
    let analysisSource = process.env.OPENROUTER_API_KEY?.trim() ? 'openrouter' : 'rule_engine';
    try {
      const aiAlerts = await getAIAlerts(prompt);
      if (aiAlerts) {
        alerts = aiAlerts;
      } else {
        alerts = fallbackAlerts;
        analysisSource = 'rule_engine';
      }
    } catch (e) {
      console.warn('AI response could not be used, falling back to rule-based alerts:', e.message);
      alerts = fallbackAlerts;
      analysisSource = 'rule_engine';
    }

    // 6. Save alerts to Supabase (avoid duplicates by clearing old ones first)
    await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (alerts.length === 0) {
      return res.status(200).json({
        message: 'No anomalies detected',
        alerts: [],
        count: 0,
        source: analysisSource,
      });
    }

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

    return res.status(200).json({ alerts: savedAlerts, count: savedAlerts.length, source: analysisSource });
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
