import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import AppTour from './components/AppTour';
import { useTour } from './hooks/useTour';
import mockFarmerRecords from './mockFarmerRecords';
import { PORTAL_URLS } from './portalUrls';

const API_BASE_URL = process.env.REACT_APP_API_URL || "https://kisansetu-lkq6.onrender.com";
console.log("API URL:", API_BASE_URL);

function goToDealerPortal() {
  window.location.href = `${PORTAL_URLS.dealer}?view=dashboard`;
}

function goToGovPortal() {
  window.location.href = `${PORTAL_URLS.gov}?view=dashboard`;
}

function getInitialEntryView() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'dashboard' || window.location.hash === '#dashboard'
    ? 'dashboard'
    : 'landing';
}

const governmentTourSteps = [
  {
    element: '[data-tour="gov-dashboard"]',
    popover: {
      title: 'Dashboard',
      description: 'This is your main screen. Here you can quickly see what is happening in the fertilizer distribution system.',
    },
  },
  {
    element: '[data-tour="gov-add"]',
    popover: {
      title: 'Add',
      description: 'Use this page to add a new fertilizer batch into the system.',
    },
  },
  {
    element: '[data-tour="gov-records"]',
    popover: {
      title: 'View Previous',
      description: 'Here you can see all previously added batches and their details.',
    },
  },
  {
    element: '[data-tour="gov-alerts"]',
    popover: {
      title: 'Alerts',
      description: 'If there is any suspicious activity or problem, it will appear here.',
    },
  },
  {
    element: '[data-tour="gov-farmers"]',
    popover: {
      title: 'Farmer Records',
      description: 'This page shows which farmer bought which fertilizer bag.',
    },
  },
  {
    element: '[data-tour="gov-scanner"]',
    popover: {
      title: 'Scanner',
      description: 'Scan a fertilizer bag here to verify it and view its information.',
    },
  },
  {
    element: '[data-tour="gov-tour-end"]',
    popover: {
      title: 'Done',
      description: "You're all set! You now know how to use the app.",
    },
  },
];

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'add', label: 'Add', icon: 'plus' },
  { id: 'records', label: 'View Previous', icon: 'document' },
  { id: 'alerts', label: 'Alerts', icon: 'bell' },
  { id: 'farmers', label: 'Farmer Records', icon: 'user' },
  { id: 'scanner', label: 'Scanner', icon: 'scan' },
];

const statCards = [
  {
    id: 'distribution',
    label: 'Total Distribution',
    value: '...',
    unit: 'Batches',
    icon: 'bag',
    accent: 'green',
  },
  {
    id: 'dealers',
    label: 'Registered Dealers',
    value: '320',
    unit: 'Dealers',
    icon: 'store',
    accent: 'blue',
  },
  {
    id: 'registeredFarmers',
    label: 'Registered Farmers',
    value: '8,752',
    unit: 'Farmers',
    icon: 'farmer',
    accent: 'purple',
  },
  {
    id: 'activeAlerts',
    label: 'Active Alerts',
    value: '24',
    unit: 'Alerts',
    icon: 'warning',
    accent: 'orange',
  },
];

const detailContent = {
  dashboard: {
    title: 'Dashboard Overview',
    body: 'Track distribution, review recent activity, and jump into the main government workflows from one place.',
  },
  add: {
    title: 'Add Batch',
    body: 'Open the batch creation flow and generate bag IDs from a single centered add action.',
  },
  records: {
    title: 'Previous Distribution Records',
    body: 'Inspect prior submissions, filter records, and manage updates to existing distribution entries.',
  },
  alerts: {
    title: 'Alerts Center',
    body: 'See suspicious activity, pending escalations, and operational warnings that require quick follow-up.',
  },
  farmers: {
    title: 'Farmer Records',
    body: 'Open farmer profiles, inspect transaction history, and validate fertilizer allocation across regions.',
  },
  scanner: {
    title: 'Scanner',
    body: 'Scan QR codes from the camera or from an uploaded image.',
  },
  distribution: {
    title: 'Total Distribution',
    body: 'This section highlights overall fertilizer movement in batches across the monitored reporting period.',
  },
  dealers: {
    title: 'Registered Dealers',
    body: 'Use this area to review the current count of onboarded dealers in the distribution network.',
  },
  registeredFarmers: {
    title: 'Registered Farmers',
    body: 'This section summarizes the active farmer base currently linked to recorded transactions.',
  },
  activeAlerts: {
    title: 'Active Alerts',
    body: 'Monitor unresolved warnings and suspicious events that still need verification or action.',
  },
};

const alertRows = [
  ['ALT9001', 'Duplicate purchase attempt', 'Sehore', 'High', 'Open'],
  ['ALT9002', 'Dealer stock mismatch', 'Vidisha', 'Medium', 'Reviewing'],
  ['ALT9003', 'Farmer limit exceeded', 'Raisen', 'High', 'Open'],
  ['ALT9004', 'Late transaction sync', 'Hoshangabad', 'Low', 'Resolved'],
];

const cropFertilizerRules = {
  wheat: ['urea', 'dap'],
  soybean: ['dap', 'npk 20:20:0:13'],
  paddy: ['urea', 'npk 20:20:0:13'],
};

function getFarmerTransactions(farmerId, lastTransaction, fertilizerType, totalReceived) {
  const transactionTimes = ['10:30 AM', '12:15 PM', '02:40 PM', '04:05 PM', '05:25 PM'];
  const transactionDates = [
    lastTransaction,
    '16 May 2025',
    '12 May 2025',
    '08 May 2025',
    '04 May 2025',
  ];
  const totalKg = Number.parseFloat(String(totalReceived).replace(/[^\d.]/g, '')) || 250;
  const kgPerTransaction = Math.max(1, Math.round(totalKg / 5));
  const farmerSuffix = farmerId.replace(/\D/g, '').slice(-5) || '10000';

  return transactionTimes.map((time, index) => [
    `${transactionDates[index]}, ${time}`,
    'Raj Singh Dealer',
    fertilizerType,
    `BATCH-${farmerSuffix}-${String(index + 1).padStart(2, '0')}`,
    `${farmerId}-BAG-${String(index + 1).padStart(3, '0')}`,
    `${kgPerTransaction} kg`,
  ]);
}

function getFarmerRiskProfile(record) {
  const triggeredRules = [];
  const alerts = [];
  let riskScore = 18;

  if (record.fertilizerPurchasedKg > record.monthlyLimitKg) {
    triggeredRules.push('Monthly fertilizer limit exceeded');
    alerts.push({
      rule: 'Limit exceeded',
      message: `${record.name} purchased ${record.fertilizerPurchasedKg} kg against a ${record.monthlyLimitKg} kg monthly limit.`,
      severity: 'High',
    });
    riskScore += 34;
  }

  if (record.fertilizerPurchasedKg > record.districtAverageKg * 1.8) {
    triggeredRules.push('Above district average purchase');
    alerts.push({
      rule: 'District average anomaly',
      message: `${record.name} is above the ${record.district} district average of ${record.districtAverageKg} kg.`,
      severity: 'Medium',
    });
    riskScore += 24;
  }

  if (record.dealersUsed > 2) {
    triggeredRules.push('Multiple dealer purchases');
    alerts.push({
      rule: 'Multiple dealers',
      message: `${record.name} purchased through ${record.dealersUsed} dealers in the review period.`,
      severity: 'Medium',
    });
    riskScore += 18;
  }

  if (record.purchases > 5) {
    triggeredRules.push('High purchase frequency');
    alerts.push({
      rule: 'Frequent purchases',
      message: `${record.name} made ${record.purchases} fertilizer purchases recently.`,
      severity: 'Medium',
    });
    riskScore += 12;
  }

  if (record.status === 'Inactive') {
    triggeredRules.push('Inactive farmer transaction activity');
    alerts.push({
      rule: 'Inactive status',
      message: `${record.name} has recent fertilizer activity while marked inactive.`,
      severity: 'High',
    });
    riskScore += 20;
  }

  const boundedRiskScore = Math.min(99, riskScore);
  const severity = boundedRiskScore >= 70 ? 'High' : boundedRiskScore >= 45 ? 'Medium' : 'Low';

  return {
    riskScore: boundedRiskScore,
    severity,
    suspicious: triggeredRules.length > 0,
    triggeredRules,
    alerts,
  };
}

function buildFarmerAnalysisRecords() {
  return mockFarmerRecords.map((record) => {
    const riskProfile = getFarmerRiskProfile(record);
    const aiInsight = riskProfile.suspicious
      ? `${record.name} needs review because ${riskProfile.triggeredRules.join(', ').toLowerCase()}.`
      : `${record.name} is within expected fertilizer distribution limits.`;

    return {
      ...record,
      ...riskProfile,
      aiInsight,
    };
  });
}

const farmerDetailsByAadhar = Object.fromEntries(
  buildFarmerAnalysisRecords().map((record) => [
    record.id,
    {
      landSize: record.landSize,
      cropType: record.cropType,
      monthlyLimit: `${record.monthlyLimitKg} kg`,
      riskLevel: record.severity,
      reason: record.triggeredRules.join(', ') || 'No risk rule triggered for this farmer.',
      fertilizersNeeded: cropFertilizerRules[record.cropType.toLowerCase()]?.join(', ') || record.fertilizerType,
    },
  ])
);

function Icon({ type }) {
  const common = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

  switch (type) {
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.2" />
          <rect x="14" y="3" width="7" height="7" rx="1.2" />
          <rect x="3" y="14" width="7" height="7" rx="1.2" />
          <rect x="14" y="14" width="7" height="7" rx="1.2" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case 'document':
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v5h5" />
          <path d="M10 13h6" />
          <path d="M10 17h6" />
        </svg>
      );
    case 'brain':
      return (
        <svg {...common}>
          <path d="M9 5a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 4" />
          <path d="M15 5a3 3 0 0 1 3 3v1a3 3 0 0 1 0 6 3 3 0 0 1-3 4" />
          <path d="M9 9a3 3 0 0 1 3-3" />
          <path d="M15 9a3 3 0 0 0-3-3" />
          <path d="M12 6v12" />
          <path d="M9 13h3" />
          <path d="M12 13h3" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...common}>
          <path d="M15 17H5l1.5-2.5V10a5.5 5.5 0 1 1 11 0v4.5L19 17h-4" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'scan':
      return (
        <svg {...common}>
          <path d="M4 8V5a1 1 0 0 1 1-1h3" />
          <path d="M16 4h3a1 1 0 0 1 1 1v3" />
          <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
          <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
          <path d="M7 12h10" />
          <path d="M9 9h6v6H9z" />
        </svg>
      );
    case 'bag':
      return (
        <svg {...common}>
          <path d="M8 5h8l-1 3H9z" />
          <path d="M7 8h10l2 4v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5z" />
          <path d="M12 11v5" />
          <path d="M9.5 13.5h5" />
        </svg>
      );
    case 'store':
      return (
        <svg {...common}>
          <path d="M4 10.5 5.5 5h13L20 10.5" />
          <path d="M5 10.5A2.5 2.5 0 0 0 10 11a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5-.5" />
          <path d="M6 11v8h12v-8" />
          <path d="M10 19v-4h4v4" />
        </svg>
      );
    case 'farmer':
      return (
        <svg {...common}>
          <path d="M12 5 7 8l5 3 5-3z" />
          <path d="M9 10v3a3 3 0 0 0 6 0v-3" />
          <path d="M6 19a6 6 0 0 1 12 0" />
          <path d="M4 8h3" />
          <path d="M17 8h3" />
        </svg>
      );
    case 'warning':
      return (
        <svg {...common}>
          <path d="M12 4 3.5 19h17z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 17 5 12l5-5" />
          <path d="M5 12h10" />
          <path d="M14 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 10 3 3 3-3" />
        </svg>
      );
    default:
      return null;
  }
}

function formatCount(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function getUniqueBagCount(records) {
  const bagIds = new Set();

  records.forEach((record) => {
    const bagId = typeof record.bag_id === 'string' ? record.bag_id.trim() : '';
    if (bagId) {
      bagIds.add(bagId);
    }
  });

  return bagIds.size;
}

function getDistributionFromScanRecords(records) {
  const receivedBatchTotals = new Map();
  const receivedBagBatches = new Map();
  const soldBagBatches = new Map();
  const dealerSoldBags = new Set();

  records.forEach((record) => {
    const status = String(record.status || '').trim().toLowerCase();
    const bagId = typeof record.bag_id === 'string' ? record.bag_id.trim() : '';
    const batchNumber = typeof record.batch_number === 'string' ? record.batch_number.trim() : '';
    const numberOfBags = Number(record.number_of_bags);
    const hasFarmerSale = Boolean(record.farmer_aadhar_id || record.farmer_name || record.decoded_payload?.farmer_aadhar);

    if (bagId && (status === 'sold' || hasFarmerSale)) {
      dealerSoldBags.add(bagId);
    }

    if (status === 'received') {
      if (bagId) {
        receivedBagBatches.set(bagId, batchNumber);
        return;
      }

      if (batchNumber && Number.isFinite(numberOfBags) && numberOfBags > 0 && record.changed !== false) {
        receivedBatchTotals.set(batchNumber, Math.max(receivedBatchTotals.get(batchNumber) || 0, numberOfBags));
      }
    }

    if (status === 'sold' && bagId) {
      soldBagBatches.set(bagId, batchNumber);
    }
  });

  if (dealerSoldBags.size > 0) {
    return dealerSoldBags.size;
  }

  const countedBatches = new Set(receivedBatchTotals.keys());
  const countedBags = new Set();
  let total = Array.from(receivedBatchTotals.values()).reduce((sum, count) => sum + count, 0);

  receivedBagBatches.forEach((batchNumber, bagId) => {
    if (!countedBatches.has(batchNumber)) {
      countedBags.add(bagId);
      total += 1;
    }
  });

  soldBagBatches.forEach((batchNumber, bagId) => {
    if (!countedBags.has(bagId) && !countedBatches.has(batchNumber)) {
      total += 1;
    }
  });

  return total;
}

function useDashboardMetrics() {
  const [metrics, setMetrics] = useState({
    distribution: null,
    dealers: 1,
    registeredFarmers: null,
    activeAlerts: null,
  });

  useEffect(() => {
    let ignore = false;

    async function loadMetricData() {
      try {
        const [scanRecordsResponse, farmerMetricsResponse, alertsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/scan-records`),
          fetch(`${API_BASE_URL}/api/farmer-records/metrics`),
          fetch(`${API_BASE_URL}/api/ai/alerts`),
        ]);

        const [scanRecordsResult, farmerMetricsResult, alertsResult] = await Promise.all([
          readJsonResponse(scanRecordsResponse),
          readJsonResponse(farmerMetricsResponse),
          readJsonResponse(alertsResponse),
        ]);

        if (!scanRecordsResponse.ok) {
          throw new Error(scanRecordsResult.error || 'Unable to load dealer scan totals.');
        }

        if (!farmerMetricsResponse.ok) {
          throw new Error(farmerMetricsResult.error || 'Unable to load farmer totals.');
        }

        if (!alertsResponse.ok) {
          throw new Error(alertsResult.error || 'Unable to load active alerts.');
        }

        let distributionTotal = getDistributionFromScanRecords(scanRecordsResult.scanRecords || []);

        if (distributionTotal === 0) {
          const transactionsResponse = await fetch(`${API_BASE_URL}/api/farmer-transactions`);
          const transactionsResult = await readJsonResponse(transactionsResponse);

          if (!transactionsResponse.ok) {
            throw new Error(transactionsResult.error || 'Unable to load distribution totals.');
          }

          distributionTotal = getUniqueBagCount(transactionsResult.transactions || []);
        }

        if (!ignore) {
          setMetrics({
            distribution: distributionTotal,
            dealers: 1,
            registeredFarmers: farmerMetricsResult.totalFarmers || 0,
            activeAlerts: (alertsResult.alerts || []).filter((alert) => (
              String(alert.status || '').trim().toLowerCase() !== 'resolved'
            )).length,
          });
        }
      } catch (error) {
        console.error(error.message || 'Unable to load dashboard metrics.');
        if (!ignore) {
          setMetrics({
            distribution: 0,
            dealers: 1,
            registeredFarmers: 0,
            activeAlerts: 0,
          });
        }
      }
    }

    loadMetricData();

    return () => {
      ignore = true;
    };
  }, []);

  return metrics;
}

function DashboardPage({ activeSection, setActiveSection, metrics, onRestartTour }) {
  const dashboardStats = statCards.map((stat) => (
    Object.prototype.hasOwnProperty.call(metrics, stat.id)
      ? { ...stat, value: metrics[stat.id] === null ? '...' : formatCount(metrics[stat.id]) }
      : stat
  ));

  return (
    <>
      <section className="hero-copy" data-tour="gov-dashboard">
        <div>
          <h2>Dashboard</h2>
          <p>Welcome, Admin</p>
        </div>
        <AppTour onRestart={onRestartTour} />
      </section>

      <section className="stats-panel">
        {dashboardStats.map((stat) => (
          <button
            key={stat.id}
            type="button"
            className={`stat-card accent-${stat.accent} ${activeSection === stat.id ? 'is-selected' : ''}`}
            onClick={() => setActiveSection(stat.id)}
          >
            <span className="stat-card__icon-wrap">
              <span className="stat-card__icon">
                <Icon type={stat.icon} />
              </span>
            </span>
            <span className="stat-card__content">
              <span className="stat-card__label">{stat.label}</span>
              <span className="stat-card__value">{stat.value}</span>
              <span className="stat-card__unit">{stat.unit}</span>
            </span>
          </button>
        ))}
      </section>
    </>
  );
}

function PageTitle({ title, subtitle, action, onAction }) {
  return (
    <section className="page-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button type="button" className="outline-action" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}

function MetricCard({ icon, label, value, unit, accent }) {
  return (
    <div className={`metric-card accent-${accent}`}>
      <span className="metric-card__icon">
        <Icon type={icon} />
      </span>
      <span>
        <span className="metric-card__label">{label}</span>
        <strong>{value}</strong>
        {unit && <small>{unit}</small>}
      </span>
    </div>
  );
}

function AddPage() {
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showGeneratedQrPage, setShowGeneratedQrPage] = useState(false);
  const [generatedBagIds, setGeneratedBagIds] = useState([]);
  const [generatedQRCodes, setGeneratedQRCodes] = useState([]);
  const [generatedBatchQRCode, setGeneratedBatchQRCode] = useState('');
  const [generatedBatchDetails, setGeneratedBatchDetails] = useState(null);
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });
  const [expiryError, setExpiryError] = useState('');
  const [batchForm, setBatchForm] = useState({
    batchNumber: '',
    numberOfBags: '',
    productName: '',
    productPrice: '',
    productExpiry: '',
    manufacturer: '',
    bagWeight: '',
  });
  const now = new Date();
  const todayIsoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (saveState.status !== 'idle') {
      setSaveState({ status: 'idle', message: '' });
    }

    if (generatedQRCodes.length > 0) {
      setGeneratedQRCodes([]);
    }

    if (generatedBatchQRCode) {
      setGeneratedBatchQRCode('');
    }

    if (showGeneratedQrPage) {
      setShowGeneratedQrPage(false);
    }

    if (name === 'productExpiry') {
      if (value && value < todayIsoDate) {
        setExpiryError('Expiry date cannot be in the past.');
      } else {
        setExpiryError('');
      }
    }

    setBatchForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleAutofillBatch = () => {
    setBatchForm({
      batchNumber: 'BATCH-2025-MH-0047',
      numberOfBags: '5',
      productName: 'Urea (46-0-0)',
      productPrice: '266',
      productExpiry: '2028-12-31',
      manufacturer: 'Rashtriya Chemicals & Fertilizers Ltd',
      bagWeight: '50 kg',
    });
    setExpiryError('');
    setSaveState({ status: 'idle', message: '' });
    setGeneratedBagIds([]);
    setGeneratedQRCodes([]);
    setGeneratedBatchQRCode('');
    setGeneratedBatchDetails(null);
    setShowGeneratedQrPage(false);
  };

  const handleGenerateBagIds = async () => {
    const bagCount = Number.parseInt(batchForm.numberOfBags, 10);
    const hasPastExpiry = batchForm.productExpiry && batchForm.productExpiry < todayIsoDate;

    if (hasPastExpiry) {
      setExpiryError('Expiry date cannot be in the past.');
      setSaveState({ status: 'error', message: 'Expiry date cannot be in the past.' });
      return;
    }

    if (!Number.isInteger(bagCount) || bagCount <= 0) {
      setGeneratedBagIds([]);
      setGeneratedQRCodes([]);
      setGeneratedBatchQRCode('');
      setGeneratedBatchDetails(null);
      setShowGeneratedQrPage(false);
      setSaveState({ status: 'error', message: 'Enter a valid number of bags before generating.' });
      return;
    }

    const normalizedBatchNumber = batchForm.batchNumber.trim().toLowerCase();

    if (!normalizedBatchNumber) {
      setGeneratedBagIds([]);
      setGeneratedQRCodes([]);
      setGeneratedBatchQRCode('');
      setGeneratedBatchDetails(null);
      setShowGeneratedQrPage(false);
      setSaveState({ status: 'error', message: 'Batch number is required.' });
      return;
    }

    const batchPrefix = (batchForm.batchNumber || 'BATCH')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const safePrefix = batchPrefix || 'BATCH';
    const bagIds = Array.from(
      { length: bagCount },
      (_, index) => `${safePrefix}-BAG-${String(index + 1).padStart(3, '0')}`
    );

    setGeneratedBagIds(bagIds);

    try {
      setSaveState({ status: 'saving', message: 'Checking batch number...' });

      const batchesResponse = await fetch(`${API_BASE_URL}/api/batches`);
      const batchesResult = await readJsonResponse(batchesResponse);

      if (!batchesResponse.ok) {
        throw new Error(batchesResult.error || 'Unable to check existing batches.');
      }

      const batchAlreadyExists = (batchesResult.batches || []).some((batch) => (
        String(batch.batch_number || '').trim().toLowerCase() === normalizedBatchNumber
      ));

      if (batchAlreadyExists) {
        setGeneratedBagIds([]);
        setSaveState({ status: 'error', message: `Batch number ${batchForm.batchNumber.trim()} already exists.` });
        return;
      }

      setSaveState({ status: 'saving', message: 'Generating QR codes and saving batch...' });

      const qrResponse = await fetch(`${API_BASE_URL}/api/qrcodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchNumber: batchForm.batchNumber,
          productName: batchForm.productName,
          manufacturer: batchForm.manufacturer,
          bagWeight: batchForm.bagWeight,
          numberOfBags: bagCount,
          productPrice: batchForm.productPrice,
          productExpiry: batchForm.productExpiry,
          bagIds,
        }),
      });

      const qrResult = await readJsonResponse(qrResponse);

      if (!qrResponse.ok) {
        throw new Error(qrResult.error || 'Unable to generate QR codes.');
      }

      const qrCodes = qrResult.qrCodes || [];
      const batchQrCodeDataUrl = qrResult.batchQrCodeDataUrl || '';
      setGeneratedQRCodes(qrCodes);
      setGeneratedBatchQRCode(batchQrCodeDataUrl);

      const batchPayload = {
        batchNumber: batchForm.batchNumber,
        numberOfBags: bagCount,
        productName: batchForm.productName,
        productPrice: batchForm.productPrice,
        productExpiry: batchForm.productExpiry,
        manufacturer: batchForm.manufacturer,
        bagWeight: batchForm.bagWeight,
        bagIds,
        qrCodes,
        batchQrCode: batchQrCodeDataUrl,
      };

      const saveResponse = await fetch(`${API_BASE_URL}/api/batches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchPayload),
      });

      const saveResult = await readJsonResponse(saveResponse);

      if (!saveResponse.ok) {
        throw new Error(saveResult.error || 'Unable to save batch.');
      }
      setGeneratedBatchDetails({
        batchNumber: batchForm.batchNumber,
        numberOfBags: batchForm.numberOfBags,
        productName: batchForm.productName,
      });
      setShowGeneratedQrPage(true);
      setSaveState({ status: 'success', message: 'Batch saved to Supabase and QR codes generated successfully.' });
    } catch (error) {
      setSaveState({
        status: 'error',
        message: error.message || 'Bag IDs were generated, but saving or QR generation failed.',
      });
    }
  };

  if (!showBatchForm) {
    return (
      <section className="page-content add-launch-page">
        <PageTitle
          title="Add Batch"
          subtitle="Use the single add button below to open the batch creation page."
        />
        <div className="add-launch-panel">
          <button
            type="button"
            className="add-launch-button"
            onClick={() => setShowBatchForm(true)}
            aria-label="Open add batch page"
          >
            <span>+</span>
          </button>
        </div>
      </section>
    );
  }

  if (showGeneratedQrPage) {
    const qrBatchDetails = generatedBatchDetails || batchForm;

    return (
      <section className="page-content">
        <PageTitle
          title="Generated QR Codes"
          action="Back to Add Batch"
          onAction={() => setShowGeneratedQrPage(false)}
        />

        {generatedBatchQRCode && (
          <section className="generated-panel qr-panel batch-qr-panel">
            <div className="generated-panel__header">
              <h3>Batch QR Code</h3>
              <p>This QR code contains all batch-level details, including total bags, price, and expiry.</p>
            </div>
            <div className="batch-qr-container">
              <article className="generated-bag-card qr-card batch-qr-card">
                <img src={generatedBatchQRCode} alt={`QR for batch ${qrBatchDetails.batchNumber}`} className="qr-image batch-qr-image" />
                <strong>Batch: {qrBatchDetails.batchNumber}</strong>
                <small>Includes: {qrBatchDetails.numberOfBags} Bags</small>
                {qrBatchDetails.productName && <span className="batch-qr-info">Product: {qrBatchDetails.productName}</span>}
                <a href={generatedBatchQRCode} download={`BATCH-${qrBatchDetails.batchNumber}.png`} className="table-action qr-download">
                  Download Batch QR
                </a>
              </article>
            </div>
          </section>
        )}

        {generatedQRCodes.length > 0 && (
          <section className="generated-panel qr-panel">
            <div className="generated-panel__header">
              <h3>Bag QR Codes</h3>
              <p>Each bag has its own QR code linked to the generated bag ID.</p>
            </div>
            <div className="generated-bag-grid qr-grid">
              {generatedQRCodes.map((qrCode) => (
                <article key={qrCode.bagId} className="generated-bag-card qr-card">
                  <img src={qrCode.qrCodeDataUrl} alt={`QR for ${qrCode.bagId}`} className="qr-image" />
                  <strong>{qrCode.bagId}</strong>
                  <a href={qrCode.qrCodeDataUrl} download={`${qrCode.bagId}.png`} className="table-action qr-download">
                    Download QR
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="page-content">
      <PageTitle
        title="Add Batch"
        subtitle="Fill batch details, then generate one bag ID for every bag entered."
        action="Back"
        onAction={() => setShowBatchForm(false)}
      />

      <div className="form-panel batch-form-panel">
        <label>
          Batch Number
          <input
            name="batchNumber"
            value={batchForm.batchNumber}
            onChange={handleInputChange}
            placeholder="Enter batch number"
          />
        </label>
        <label>
          No of Bags
          <input
            name="numberOfBags"
            type="number"
            min="1"
            value={batchForm.numberOfBags}
            onChange={handleInputChange}
            placeholder="Enter number of bags"
          />
        </label>
        <label>
          Product Name
          <input
            name="productName"
            value={batchForm.productName}
            onChange={handleInputChange}
            placeholder="Enter product name"
          />
        </label>
        <label>
          Product Price
          <input
            name="productPrice"
            type="number"
            min="0"
            value={batchForm.productPrice}
            onChange={handleInputChange}
            placeholder="Enter product price"
          />
        </label>
        <label>
          Product Expiry
          <input
            name="productExpiry"
            type="date"
            min={todayIsoDate}
            value={batchForm.productExpiry}
            onChange={handleInputChange}
          />
          {expiryError && <span className="form-hint form-hint--error">{expiryError}</span>}
        </label>
        <label>
          Manufacturer
          <input
            name="manufacturer"
            value={batchForm.manufacturer}
            onChange={handleInputChange}
            placeholder="Enter manufacturer name"
          />
        </label>
        <label className="full-width">
          Weight of Each Bag
          <input
            name="bagWeight"
            value={batchForm.bagWeight}
            onChange={handleInputChange}
            placeholder="Example: 50 kg"
          />
        </label>

        <div className="batch-form-actions full-width">
          <button type="button" className="outline-action" onClick={() => setShowBatchForm(false)}>
            Back
          </button>
          <button type="button" className="outline-action" onClick={handleAutofillBatch}>
            Autofill
          </button>
          <button type="button" className="primary-action" onClick={handleGenerateBagIds}>
            Generate
          </button>
        </div>
      </div>

      {saveState.status !== 'idle' && (
        <p className={`form-hint form-hint--${saveState.status}`}>{saveState.message}</p>
      )}

      {generatedBagIds.length === 0 && batchForm.numberOfBags && (
        <p className="form-hint">Enter a valid number of bags and click Generate to create bag IDs.</p>
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getBatchStatusTotals(batch) {
  const totals = { sold: 0, sent: 0, received: 0 };
  const codes = Array.isArray(batch?.qr_codes) ? batch.qr_codes : [];

  codes.forEach((qrCode) => {
    const status = String(qrCode?.status || '').trim().toLowerCase();
    if (status === 'sold') totals.sold += 1;
    if (status === 'sent' || status === 'received' || status === 'sold') totals.sent += 1;
    if (status === 'received') totals.received += 1;
  });

  return totals;
}

async function readJsonResponse(response) {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error(`Server returned ${response.status} ${response.statusText} instead of JSON.`);
  }
}

function PreviousPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [historyState, setHistoryState] = useState({
    status: 'loading',
    message: 'Loading saved batches...',
  });

  useEffect(() => {
    let ignore = false;

    async function loadBatches() {
      try {
        setHistoryState({ status: 'loading', message: 'Loading saved batches...' });

        const response = await fetch(`${API_BASE_URL}/api/batches`);
        const result = await readJsonResponse(response);

        if (!response.ok) {
          throw new Error(result.error || 'Unable to load batches.');
        }

        if (ignore) {
          return;
        }

        const loadedBatches = result.batches || [];
        setBatches(loadedBatches);
        setSelectedBatch(null);
        setHistoryState({
          status: 'success',
          message: loadedBatches.length ? '' : 'No batches have been created yet.',
        });
      } catch (error) {
        if (!ignore) {
          setHistoryState({
            status: 'error',
            message: error.message || 'Unable to load batches.',
          });
        }
      }
    }

    loadBatches();

    return () => {
      ignore = true;
    };
  }, []);

  const batchRows = batches.map((batch) => ([
    batch.batch_number,
    batch.product_name || 'Not set',
    `${batch.number_of_bags} bags`,
    batch.manufacturer || 'Not set',
    formatDate(batch.product_expiry),
    formatDate(batch.created_at),
    'View Details',
  ]));

  return (
    <section className="page-content">
      <PageTitle title="Previous Batches" subtitle="View every created batch and open full batch details." />
      {historyState.status !== 'success' && (
        <p className={`form-hint form-hint--${historyState.status === 'loading' ? 'saving' : 'error'}`}>
          {historyState.message}
        </p>
      )}
      {historyState.status === 'success' && batches.length > 0 && (
        <DataTable
          columns={['Batch Number', 'Product Name', 'No of Bags', 'Manufacturer', 'Expiry', 'Created On', 'Action']}
          rows={batchRows}
          onAction={(row) => {
            const selectedRowBatchNumber = row[0];
            setSelectedBatch(
              batches.find((batch) => batch.batch_number === selectedRowBatchNumber) || null
            );
          }}
        />
      )}
      {selectedBatch && (
        <div className="details-modal-backdrop" role="presentation" onClick={() => setSelectedBatch(null)}>
          <section
            className="details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="batch-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="details-modal__header">
              <div>
                <h3 id="batch-details-title">{selectedBatch.batch_number}</h3>
                <p>Batch details, bag IDs, and saved QR codes.</p>
              </div>
              <button type="button" className="outline-action" onClick={() => setSelectedBatch(null)}>Close</button>
            </div>

            <div className="batch-detail-grid">
              <div><span>Product Name</span><strong>{selectedBatch.product_name || 'Not set'}</strong></div>
              <div><span>No of Bags</span><strong>{selectedBatch.number_of_bags}</strong></div>
              <div><span>Product Price</span><strong>{selectedBatch.product_price || 'Not set'}</strong></div>
              <div><span>Product Expiry</span><strong>{formatDate(selectedBatch.product_expiry)}</strong></div>
              <div><span>Manufacturer</span><strong>{selectedBatch.manufacturer || 'Not set'}</strong></div>
              <div><span>Weight of Each Bag</span><strong>{selectedBatch.bag_weight || 'Not set'}</strong></div>
              <div><span>Created On</span><strong>{formatDate(selectedBatch.created_at)}</strong></div>
            </div>

            <div className="batch-subsection">
              <h4>QR Status Summary</h4>
              <div className="status-totals-grid">
                {(() => {
                  const { sold, sent, received } = getBatchStatusTotals(selectedBatch);
                  return (
                    <>
                      <article className="status-total-card">
                        <span>Sold</span>
                        <strong>{sold}</strong>
                      </article>
                      <article className="status-total-card">
                        <span>Sent</span>
                        <strong>{sent}</strong>
                      </article>
                      <article className="status-total-card">
                        <span>Received</span>
                        <strong>{received}</strong>
                      </article>
                    </>
                  );
                })()}
              </div>
            </div>

            {selectedBatch.batch_qr_code && (
              <div className="batch-subsection">
                <h4>Batch QR Code</h4>
                <div className="batch-qr-container" style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
                  <article className="generated-bag-card qr-card batch-qr-card" style={{ maxWidth: '240px', width: '100%', textAlign: 'center', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <img src={selectedBatch.batch_qr_code} alt={`QR for batch ${selectedBatch.batch_number}`} className="qr-image batch-qr-image" style={{ width: '100%', height: 'auto', marginBottom: '10px', borderRadius: '6px' }} />
                    <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '5px' }}>Batch: {selectedBatch.batch_number}</strong>
                    <small style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '10px' }}>Includes: {selectedBatch.number_of_bags} Bags</small>
                    <a href={selectedBatch.batch_qr_code} download={`BATCH-${selectedBatch.batch_number}.png`} className="table-action qr-download" style={{ display: 'inline-block', width: '100%', padding: '8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      Download Batch QR
                    </a>
                  </article>
                </div>
              </div>
            )}

            <div className="batch-subsection">
              <h4>Bag IDs</h4>
              <div className="detail-chip-grid">
                {(selectedBatch.bag_ids || []).map((bagId) => (
                  <span key={bagId} className="detail-chip">
                    {bagId}
                  </span>
                ))}
              </div>
            </div>

            {!!selectedBatch.qr_codes?.length && (
              <div className="batch-subsection">
                <h4>Saved QR Codes</h4>
                <div className="generated-bag-grid qr-grid">
                  {selectedBatch.qr_codes.map((qrCode) => (
                    <article key={qrCode.bagId} className="generated-bag-card qr-card">
                      <img src={qrCode.qrCodeDataUrl} alt={`QR for ${qrCode.bagId}`} className="qr-image" />
                      <strong>{qrCode.bagId}</strong>
                      <a href={qrCode.qrCodeDataUrl} download={`${qrCode.bagId}.png`} className="table-action qr-download">
                        Download QR
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

function AnalysisPage() {
  const [records, setRecords] = useState([]);
  const [state, setState] = useState({ status: 'loading', message: 'Loading farmer records...' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedSeverity, setSelectedSeverity] = useState('All Severity');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedReview, setSelectedReview] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { type: 'answer', text: 'Ask about flagged farmers, triggered rules, high risk list, or specific farmer IDs.' },
  ]);

  useEffect(() => {
    setState({ status: 'loading', message: 'Loading farmer records...' });
    const timer = setTimeout(() => {
      const loaded = buildFarmerAnalysisRecords();
      setRecords(loaded);
      setState({ status: 'success', message: loaded.length ? '' : 'No farmer records found.' });
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const districts = useMemo(
    () => ['All Districts', ...Array.from(new Set(records.map((record) => record.district).filter(Boolean)))],
    [records]
  );

  const filteredRecords = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = `${record.id} ${record.name} ${record.district} ${record.cropType} ${record.fertilizerType}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      const matchesDistrict = selectedDistrict === 'All Districts' || record.district === selectedDistrict;
      const matchesSeverity = selectedSeverity === 'All Severity' || record.severity === selectedSeverity;
      return matchesSearch && matchesDistrict && matchesSeverity;
    });
  }, [records, searchTerm, selectedDistrict, selectedSeverity]);

  const suspiciousFarmers = useMemo(
    () => [...filteredRecords].filter((record) => record.suspicious).sort((a, b) => b.riskScore - a.riskScore),
    [filteredRecords]
  );
  const highRiskCount = filteredRecords.filter((record) => record.severity === 'High').length;
  const mediumRiskCount = filteredRecords.filter((record) => record.severity === 'Medium').length;
  const lowRiskCount = filteredRecords.filter((record) => record.severity === 'Low').length;
  const triggerCount = filteredRecords.reduce((sum, record) => sum + record.triggeredRules.length, 0);
  const suspiciousDealerCount = new Set(suspiciousFarmers.filter((record) => record.dealersUsed > 2).map((record) => `${record.district}-${record.dealersUsed}`)).size;
  const ruleTriggerRows = suspiciousFarmers.flatMap((record) => record.triggeredRules.map((rule) => [record.id, record.name, rule, record.severity]));
  const recentAlerts = suspiciousFarmers.slice(0, 5).flatMap((record) => record.alerts.map((alert) => [alert.rule, alert.message, record.district, alert.severity])).slice(0, 8);
  const aiInsightFeed = suspiciousFarmers.slice(0, 5).map((record) => `${record.aiInsight} Triggered: ${record.triggeredRules.join(', ')}.`);

  const tabs = [
    ['overview', 'Overview'],
    ['risk', 'Rule Engine Risk Detection'],
    ['behavior', 'Rule-Based Risk Triggers'],
    ['recommendations', 'Recommendations'],
    ['chatbot', 'AI Chatbot'],
  ];

  const handleChatSubmit = (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question) return;

    const normalizedQuestion = question.toLowerCase();
    let answer = `Rule Engine analyzed ${filteredRecords.length} farmer records. AI explains these outputs only.`;
    const mentioned = records.find((record) => normalizedQuestion.includes(record.id.toLowerCase()) || normalizedQuestion.includes(record.name.toLowerCase()));

    if (mentioned) {
      answer = `${mentioned.name} (${mentioned.id}) has Rule Risk Score ${mentioned.riskScore} (${mentioned.severity}) due to: ${mentioned.triggeredRules.join(', ') || 'No rule triggered'}. AI Insight: ${mentioned.aiInsight}`;
    } else if (normalizedQuestion.includes('high risk')) {
      answer = `High risk farmers: ${suspiciousFarmers.filter((record) => record.severity === 'High').map((record) => `${record.name} (${record.id})`).join(', ') || 'None in current filters'}.`;
    } else if (normalizedQuestion.includes('multiple dealer')) {
      answer = `Farmers with multiple dealer purchases: ${suspiciousFarmers.filter((record) => record.triggeredRules.includes('Multiple dealer purchases')).map((record) => `${record.name} (${record.id})`).join(', ') || 'None'}.`;
    } else if (normalizedQuestion.includes('triggered rules')) {
      answer = `Triggered rule count is ${triggerCount}. Top triggered rules: ${ruleTriggerRows.slice(0, 5).map((row) => row[2]).join(', ') || 'None'}.`;
    }

    setChatMessages((current) => [...current, { type: 'question', text: question }, { type: 'answer', text: answer }]);
    setChatInput('');
  };

  return (
    <section className="page-content ai-page">
      <div className="ai-page-title">
        <PageTitle title="AI Analysis" subtitle="AI-powered insights and rule-based risk scoring from live Farmer Records." />
        <div className="ai-controls">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search farmer, Aadhaar, district, fertilizer..."
            aria-label="Search analysis records"
          />
          <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
            {districts.map((district) => <option key={district}>{district}</option>)}
          </select>
          <select value={selectedSeverity} onChange={(event) => setSelectedSeverity(event.target.value)}>
            <option>All Severity</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>
      </div>

      {state.status !== 'success' && (
        <p className={`form-hint form-hint--${state.status === 'loading' ? 'saving' : 'error'}`}>{state.message}</p>
      )}

      {state.status === 'success' && (
        <>
          <div className="metric-grid ai-metric-grid">
            <MetricCard icon="document" label="Total Records Analyzed" value={filteredRecords.length} accent="blue" />
            <MetricCard icon="warning" label="High Risk Farmers" value={highRiskCount} accent="orange" />
            <MetricCard icon="store" label="Suspicious Dealers" value={suspiciousDealerCount} accent="purple" />
            <MetricCard icon="brain" label="Rule Trigger Count" value={triggerCount} accent="green" />
          </div>

          <div className="ai-tabs" aria-label="AI analysis sections">
            {tabs.map(([id, label]) => (
              <button key={id} type="button" className={activeTab === id ? 'is-active' : ''} onClick={() => setActiveTab(id)}>
                {label}
              </button>
            ))}
          </div>

          <div className="ai-layout">
            <div className="ai-main">
              {selectedReview && (
                <section className="farmer-detail-card">
                  <div className="farmer-detail-card__header">
                    <div>
                      <p>Selected Risk Review</p>
                      <h3>{selectedReview.name}</h3>
                    </div>
                    <span className={`risk-pill risk-${selectedReview.severity.toLowerCase()}`}>Rule Risk Score {selectedReview.riskScore}</span>
                  </div>
                  <div className="farmer-detail-grid">
                    <div><span>Farmer ID</span><strong>{selectedReview.id}</strong></div>
                    <div><span>Land Size</span><strong>{selectedReview.landSize}</strong></div>
                    <div><span>Crop</span><strong>{selectedReview.cropType}</strong></div>
                    <div><span>Fertilizer Purchased</span><strong>{selectedReview.fertilizerPurchasedKg} kg</strong></div>
                  </div>
                  <div className="farmer-detail-reason">
                    <span>Rule Engine Triggers</span>
                    <p>{selectedReview.triggeredRules.join(', ') || 'No trigger'}</p>
                  </div>
                </section>
              )}

              {['overview', 'risk'].includes(activeTab) && (
                <section className="ai-card">
                  <div className="ai-card__header">
                    <div>
                      <h3>Top Suspicious Farmers</h3>
                      <p>Generated by Rule Engine from Farmer Records</p>
                    </div>
                  </div>
                  <DataTable
                    columns={['Farmer ID', 'Farmer Name', 'District', 'Rule Risk Score', 'Trigger (Top)', 'Action']}
                    rows={suspiciousFarmers.map((record) => [record.id, record.name, record.district, record.riskScore, record.triggeredRules[0] || 'None', 'View Details'])}
                    onAction={(row) => {
                      const record = suspiciousFarmers.find((farmer) => farmer.id === row[0]);
                      setSelectedReview(record || null);
                    }}
                  />
                </section>
              )}

              {['overview', 'risk'].includes(activeTab) && (
                <section className="ai-card">
                  <div className="ai-card__header">
                    <div>
                      <h3>Rule Trigger Table</h3>
                      <p>Rule Engine trigger outputs by farmer</p>
                    </div>
                  </div>
                  <DataTable columns={['Farmer ID', 'Farmer Name', 'Rule Trigger', 'Severity']} rows={ruleTriggerRows} />
                </section>
              )}

              {activeTab === 'behavior' && (
                <section className="ai-card">
                  <div className="ai-card__header">
                    <div>
                      <h3>Recent Alerts</h3>
                      <p>Latest anomaly alerts from Rule Engine</p>
                    </div>
                  </div>
                  <DataTable columns={['Type', 'Description', 'District', 'Severity']} rows={recentAlerts} />
                </section>
              )}

              {activeTab === 'recommendations' && (
                <section className="ai-card">
                  <div className="ai-card__header">
                    <div>
                      <h3>AI Insight Feed</h3>
                      <p>AI explanations based on Rule Engine outputs</p>
                    </div>
                  </div>
                  <div className="ai-insight-list">
                    {aiInsightFeed.map((insight) => (
                      <article key={insight}><strong>AI Explanation</strong><span>{insight}</span></article>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="ai-side">
              {['overview', 'chatbot'].includes(activeTab) && (
                <section className="ai-card ai-chat">
                  <div className="ai-card__header">
                    <div>
                      <h3>AI Chatbot</h3>
                      <p>AI explains Rule Engine decisions. It does not make decisions.</p>
                    </div>
                  </div>
                  <div className="chat-messages">
                    {chatMessages.map((message, index) => (
                      <div key={`${message.type}-${index}`} className={`chat-bubble chat-bubble--${message.type}`}>
                        {message.text}
                      </div>
                    ))}
                  </div>
                  <form className="chat-form" onSubmit={handleChatSubmit}>
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Ask about high-risk farmers, fertilizer patterns, inactive records..."
                      aria-label="Ask AI chatbot"
                    />
                    <button type="submit">Send</button>
                  </form>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
    </section>
  );
}

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState({ loading: false, message: '' });

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/alerts`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {
      console.error('Failed to load alerts:', e);
    }
  };

  const runAnalysis = async () => {
    setStatus({ loading: true, message: 'Running AI analysis...' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setStatus({ loading: false, message: `Analysis complete. ${data.count || 0} alerts generated.` });
      loadAlerts();
    } catch (e) {
      setStatus({ loading: false, message: `Error: ${e.message}` });
    }
  };

  return (
    <section className="page-content">
      <PageTitle
        title="Alerts"
        subtitle="AI-powered anomaly detection for fertilizer distribution."
        action={status.loading ? 'Running...' : 'Run AI Analysis'}
        onAction={runAnalysis}
      />

      {status.message && (
        <p className={`form-hint form-hint--${status.message.startsWith('Error') ? 'error' : 'success'}`}>
          {status.message}
        </p>
      )}

      <div className="metric-grid">
        <MetricCard icon="warning" label="Total Alerts" value={alerts.length} accent="orange" />

      </div>

      {alerts.length > 0 ? (
        <DataTable
          columns={['Farmer', 'District', 'Type', 'Message', 'Severity', 'Status']}
          rows={alerts.map(a => [
            a.farmer_name || a.farmer_aadhar,
            a.district || '—',
            a.alert_type?.replace(/_/g, ' ') || '—',
            a.message,
            a.severity,
            a.status,
          ])}
        />
      ) : (
        <p className="form-hint">No alerts yet. Click "Run AI Analysis" to scan for anomalies.</p>
      )}
    </section>
  );
}
function NpkBar({ label, value, max, color }) {
  const pct = Math.min(100, Math.round(((value || 0) / max) * 100));
  return (
    <div className="npk-bar-row">
      <span className="npk-bar-label">{label}</span>
      <div className="npk-bar-track">
        <div className="npk-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="npk-bar-value">{value != null ? `${value} kg/ha` : '—'}</span>
    </div>
  );
}

function FarmerDetailPanel({ aadharId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [detailState, setDetailState] = useState({ status: 'loading', message: 'Loading farmer details...' });
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setDetailState({ status: 'loading', message: 'Loading farmer details...' });
        const response = await fetch(`${API_BASE_URL}/api/farmer-records/${encodeURIComponent(aadharId)}`);
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || 'Unable to load farmer details.');
        if (isMounted) {
          setDetail(result);
          const txResponse = await fetch(`${API_BASE_URL}/api/farmer-transactions/${encodeURIComponent(aadharId)}`);
          const txResult = await readJsonResponse(txResponse);
          if (txResponse.ok) setTransactions(txResult.transactions || []);
          setDetailState({ status: 'success', message: '' });
        }
      } catch (error) {
        if (isMounted) setDetailState({ status: 'error', message: error.message || 'Failed to load.' });
      }
    }
    load();
    return () => { isMounted = false; };
  }, [aadharId]);

  const farmer = detail?.farmer || {};
  const land = detail?.land || [];
  const crops = detail?.crops || [];
  const soilHealth = detail?.soilHealth || [];

  return (
    <section className="page-content">
      <PageTitle
        title="Farmer Details"
        subtitle="Full profile across all four data tables."
        action="Back"
        onAction={onBack}
      />

      {detailState.status !== 'success' && (
        <p className={`form-hint form-hint--${detailState.status === 'loading' ? 'saving' : 'error'}`}>
          {detailState.message}
        </p>
      )}

      {detailState.status === 'success' && (
        <div className="farmer-full-detail-grid">

          {/* ── Card 1: Basic Info ── */}
          <section className="farmer-detail-section">
            <div className="farmer-detail-section__header">
              <span className="farmer-detail-section__icon">🪪</span>
              <div>
                <h3>Basic Information</h3>
                <p>Identity & subsidy details from farmer_records</p>
              </div>
            </div>
            <div className="farmer-detail-grid">
              <div><span>Aadhar ID</span><strong>{farmer.aadhar_id || '—'}</strong></div>
              <div><span>Name</span><strong>{farmer.name || '—'}</strong></div>
              <div><span>Village</span><strong>{farmer.village || '—'}</strong></div>
              <div><span>District</span><strong>{farmer.district || '—'}</strong></div>
              <div><span>Phone</span><strong>{farmer.phone || '—'}</strong></div>
            </div>
            {(() => {
              const totalUsed = transactions.reduce((sum, tx) => sum + (tx.quantity_kg || 0), 0);
              const limit = farmer.limit ?? 0;
              const remaining = Math.max(0, limit - totalUsed);
              const pct = limit > 0 ? Math.min(100, Math.round((totalUsed / limit) * 100)) : 0;
              const barColor = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e';
              return (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                    <span>Seasonal Fertilizer Usage</span>
                    <span style={{ color: barColor, fontWeight: 600 }}>{pct}% used</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '6px', height: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '6px', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px' }}>Total Limit</div>
                      <strong>{limit} kg</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px' }}>Used</div>
                      <strong style={{ color: barColor }}>{totalUsed} kg</strong>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px' }}>Remaining</div>
                      <strong style={{ color: '#22c55e' }}>{remaining} kg</strong>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* ── Card 2: Land Records ── */}
          <section className="farmer-detail-section">
            <div className="farmer-detail-section__header">
              <span className="farmer-detail-section__icon">🌾</span>
              <div>
                <h3>Land Records</h3>
                <p>Registered land parcels from land_records</p>
              </div>
            </div>
            {land.length === 0 ? (
              <p className="farmer-detail-empty">No land records found.</p>
            ) : (
              <div className="farmer-detail-grid">
                {land.map((row, i) => (
                  <div key={row.id}>
                    <span>Parcel {i + 1}</span>
                    <strong>{row.land_area != null ? `${row.land_area} acres` : '—'}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Card 3: Crop Records ── */}
          <section className="farmer-detail-section">
            <div className="farmer-detail-section__header">
              <span className="farmer-detail-section__icon">🌱</span>
              <div>
                <h3>Crop Records</h3>
                <p>Season & crop data from crop_records</p>
              </div>
            </div>
            {crops.length === 0 ? (
              <p className="farmer-detail-empty">No crop records found.</p>
            ) : (
              <div className="crop-records-list">
                {crops.map((row) => (
                  <div key={row.id} className="crop-record-item">
                    <div className="crop-record-season">
                      <span>Season</span>
                      <strong>{row.season || '—'}</strong>
                    </div>
                    <div className="crop-record-types">
                      {(row.crop_types || []).map((crop) => (
                        <span key={crop} className="crop-tag">{crop}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Card 4: Soil Health ── */}
          <section className="farmer-detail-section">
            <div className="farmer-detail-section__header">
              <span className="farmer-detail-section__icon">🧪</span>
              <div>
                <h3>Soil Health</h3>
                <p>NPK nutrient levels from soilhealth_records</p>
              </div>
            </div>
            {soilHealth.length === 0 ? (
              <p className="farmer-detail-empty">No soil health records found.</p>
            ) : (
              soilHealth.map((row) => (
                <div key={row.id} className="npk-section">
                  <NpkBar label="Nitrogen (N)" value={row.nitrogen} max={400} color="#22c55e" />
                  <NpkBar label="Phosphorus (P)" value={row.phosphorus} max={250} color="#3b82f6" />
                  <NpkBar label="Potassium (K)" value={row.potassium} max={300} color="#f59e0b" />
                </div>
              ))
            )}
          </section>

          {/* ── Card 5: Transaction History ── */}
          <section className="farmer-detail-section" style={{ gridColumn: '1 / -1' }}>
            <div className="farmer-detail-section__header">
              <span className="farmer-detail-section__icon">🧾</span>
              <div>
                <h3>Purchase History</h3>
                <p>Real fertilizer transactions from farmer_transactions</p>
              </div>
            </div>
            {transactions.length === 0 ? (
              <p className="farmer-detail-empty">No transactions recorded yet.</p>
            ) : (
              <table className="records-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Dealer</th>
                    <th>Fertilizer</th>
                    <th>Batch</th>
                    <th>Bag ID</th>
                    <th>Quantity (kg)</th>
                    <th>Season</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.created_at).toLocaleString('en-IN')}</td>
                      <td>{tx.dealer_name || 'N/A'}</td>
                      <td>{tx.fertilizer_name || 'N/A'}</td>
                      <td>{tx.batch_number || 'N/A'}</td>
                      <td>{tx.bag_id || 'N/A'}</td>
                      <td>{tx.quantity_kg} kg</td>
                      <td>{tx.season || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>


        </div>
      )}
    </section>
  );
}
function FarmerRecordsPage() {
  const [farmers, setFarmers] = useState([]);
  const [state, setState] = useState({ status: 'loading', message: 'Loading farmer records...' });
  const [selectedAadhar, setSelectedAadhar] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [farmerMetrics, setFarmerMetrics] = useState({ totalFarmers: 0, activeFarmers: 0 });

  useEffect(() => {
    let isMounted = true;

    async function loadFarmerMetrics() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/farmer-records/metrics`);
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || 'Unable to load farmer metrics.');
        if (isMounted) setFarmerMetrics({ totalFarmers: result.totalFarmers ?? 0, activeFarmers: result.activeFarmers ?? 0 });
      } catch (error) {
        console.error('Unable to load farmer metrics:', error);
      }
    }

    async function loadFarmers() {
      try {
        setState({ status: 'loading', message: 'Loading farmer records...' });
        const response = await fetch(`${API_BASE_URL}/api/farmer-records/`);
        const result = await readJsonResponse(response);
        if (!response.ok) throw new Error(result.error || 'Unable to load farmers.');
        if (isMounted) {
          setFarmers(result.farmers || []);
          setState({ status: 'success', message: (result.farmers || []).length ? '' : 'No farmer records found.' });
        }
      } catch (error) {
        if (isMounted) setState({ status: 'error', message: error.message || 'Failed to load farmer records.' });
      }
    }

    loadFarmerMetrics();
    loadFarmers();

    return () => { isMounted = false; };
  }, []);

  const districts = useMemo(
    () => ['All Districts', ...Array.from(new Set(farmers.map((f) => f.district).filter(Boolean)))],
    [farmers]
  );

  const filteredFarmers = useMemo(() => {
    const norm = searchTerm.trim().toLowerCase();
    return farmers.filter((f) => {
      const hay = `${f.aadhar_id} ${f.name} ${f.village} ${f.district}`.toLowerCase();
      const matchSearch = !norm || hay.includes(norm) || hay.replace(/\s/g, '').includes(norm.replace(/\s/g, ''));
      const matchDistrict = selectedDistrict === 'All Districts' || f.district === selectedDistrict;
      return matchSearch && matchDistrict;
    });
  }, [farmers, searchTerm, selectedDistrict]);

  if (selectedAadhar) {
    return <FarmerDetailPanel aadharId={selectedAadhar} onBack={() => setSelectedAadhar(null)} />;
  }

  return (
    <section className="page-content">
      <PageTitle title="Farmer Records" subtitle="View farmer profiles across all four data tables." />
      <div className="filter-row">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by name, Aadhaar, village, district..."
          aria-label="Search farmer records"
        />
        <select value={selectedDistrict} onChange={(event) => setSelectedDistrict(event.target.value)}>
          {districts.map((district) => <option key={district}>{district}</option>)}
        </select>
      </div>
      {state.status !== 'success' && (
        <p className={`form-hint form-hint--${state.status === 'loading' ? 'saving' : 'error'}`}>{state.message}</p>
      )}
      <div className="metric-grid">
        <MetricCard icon="user" label="Total Farmers" value={farmerMetrics.totalFarmers.toLocaleString('en-IN')} accent="teal" />
      </div>
      <DataTable
        columns={['Aadhar ID', 'Name', 'Village', 'District', 'Phone', 'Limit (kg)', 'Action']}
        rows={filteredFarmers.map((f) => [
  f.aadhar_id,
  f.name,
  f.village || '—',
  f.district || '—',
  f.phone || '—',
  f.limit != null ? String(f.limit) : '—',
  'View Details',
])}
        footer={`Showing ${filteredFarmers.length} of ${farmers.length} records`}
        onAction={(row) => setSelectedAadhar(row[0])}
      />
    </section>
  );
}

function ScannerPage() {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanRequestRef = useRef(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Ready');
  const [scanResult, setScanResult] = useState('');
  const [scanUpdate, setScanUpdate] = useState(null);
  const [scanError, setScanError] = useState('');
  const isResultUrl = /^https?:\/\//i.test(scanResult);

  useEffect(() => {
    let isMounted = true;

    Html5Qrcode.getCameras()
      .then((availableCameras) => {
        if (!isMounted) return;

        setCameras(availableCameras);
        if (availableCameras.length > 0) {
          setSelectedCamera(availableCameras[0].id);
        }
      })
      .catch(() => {
        if (isMounted) {
          setScanStatus('Camera unavailable');
        }
      });

    return () => {
      isMounted = false;

      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => { });
      } else {
        scannerRef.current?.clear?.();
      }
    };
  }, []);

  async function getScanner() {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    return scannerRef.current;
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (scanner.isScanning) {
      await scanner.stop();
    }

    scanner.clear();
    setIsScanning(false);
  }

  function getBagIdFromScan(decodedText) {
    try {
      const parsedValue = JSON.parse(decodedText);
      return parsedValue.bagId || parsedValue.bag_id || parsedValue.id || '';
    } catch {
      return decodedText;
    }
  }

  async function handleScanSuccess(decodedText) {
    if (scanRequestRef.current) return;

    scanRequestRef.current = true;
    setScanResult(decodedText);
    setScanUpdate(null);
    setScanError('');
    setScanStatus('Updating status...');

    try {
      if (scannerRef.current?.isScanning) {
        await stopScanner();
      }

      let isBatchQR = false;
      let batchNumber = '';
      try {
        const parsed = JSON.parse(decodedText);
        if (parsed && parsed.batchNumber && !parsed.bagId) {
          isBatchQR = true;
          batchNumber = parsed.batchNumber;
        }
      } catch (err) {
        // Not a JSON payload, treated as raw text (bag ID)
      }

      let response;
      if (isBatchQR) {
        setScanStatus('Updating batch status');
        response = await fetch(`${API_BASE_URL}/api/batches/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchNumber, scannedBy: 'gov' }),
        });
      } else {
        const bagId = getBagIdFromScan(decodedText);
        if (!bagId) {
          throw new Error('The scanned QR code does not contain a valid bag ID.');
        }

        setScanStatus('Updating bag status');
        response = await fetch(`${API_BASE_URL}/api/batches/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bagId, scannedBy: 'gov' }),
        });
      }

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update status.');
      }

      if (isBatchQR) {
        setScanUpdate({
          bagId: `BATCH: ${result.batchNumber}`,
          message: result.message,
          batchNumber: result.batchNumber,
          status: result.status,
          changed: result.changed,
        });
        setScanStatus(result.changed ? 'Marked sent' : 'Batch already sent');
      } else {
        setScanUpdate(result);
        setScanStatus(result.changed ? 'Marked sent' : 'Bag already sent');
      }
    } catch (error) {
      setScanStatus('Scan update failed');
      setScanError(error.message || 'Unable to update status.');
    } finally {
      scanRequestRef.current = false;
    }
  }

  async function startScanner() {
    setScanError('');
    setScanStatus('Starting camera');

    try {
      const scanner = await getScanner();

      if (scanner.isScanning) {
        await stopScanner();
      }

      await scanner.start(
        selectedCamera || { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        }
      );

      setIsScanning(true);
      setScanStatus('Scanning');
    } catch (error) {
      setIsScanning(false);
      setScanStatus('Camera unavailable');
      setScanError(error?.message || 'Unable to start scanner.');
    }
  }

  async function scanFileWithNativeDetector(file) {
    if (!window.BarcodeDetector || !window.createImageBitmap) {
      throw new Error('Native QR detector is not available in this browser.');
    }

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const imageBitmap = await window.createImageBitmap(file);

    try {
      const codes = await detector.detect(imageBitmap);
      const qrCode = codes.find((code) => code.rawValue);

      if (!qrCode) {
        throw new Error('No QR code could be read from this image.');
      }

      return qrCode.rawValue;
    } finally {
      imageBitmap.close?.();
    }
  }
  async function resizeImage(file, maxDimension) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Canvas resize failed'));
            resolve(new File([blob], file.name, { type: file.type }));
          },
          file.type || 'image/jpeg'
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image failed to load for resizing'));
      };

      img.src = url;
    });
  }
  async function handleFileScan(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  setScanError('');
  setScanStatus('Reading image');

  try {
    const scanner = await getScanner();
    if (scanner.isScanning) await stopScanner();

    let decodedText = null;

    // PRIMARY: Server-side decode (100% reliable)
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`${API_BASE_URL}/api/qrcodes/decode`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.decodedText) {
        decodedText = result.decodedText;
      }
    } catch (e) {
      console.warn('Server decode failed, trying browser:', e);
    }

    // FALLBACK: Browser-side html5-qrcode
    if (!decodedText) {
      try {
        decodedText = await scanner.scanFile(file, true);
      } catch (e) {}
    }

    // FALLBACK: Resized versions
    if (!decodedText) {
      for (const size of [1200, 800, 400]) {
        try {
          const resized = await resizeImage(file, size);
          decodedText = await scanner.scanFile(resized, true);
          if (decodedText) break;
        } catch (e) {}
      }
    }

    if (!decodedText) throw new Error('No QR code could be read from this image.');
    await handleScanSuccess(decodedText);
  } catch (error) {
    setScanStatus('No QR found');
    setScanError(error?.message || 'No QR code could be read.');
  } finally {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }
}
  async function copyResult() {
    if (!scanResult) return;

    try {
      await navigator.clipboard.writeText(scanResult);
      setScanStatus('Copied');
    } catch {
      setScanError('Unable to copy result.');
    }
  }

  return (
    <section className="page-content">
      <PageTitle title="Scanner" subtitle="Scan QR codes from camera or image files." />

      <div className="scanner-layout">
        <section className="scanner-panel">
          <div className="scanner-toolbar">
            <select
              value={selectedCamera}
              onChange={(event) => setSelectedCamera(event.target.value)}
              disabled={isScanning || cameras.length === 0}
              aria-label="Camera"
            >
              {cameras.length === 0 && <option value="">Default camera</option>}
              {cameras.map((camera, index) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>

            <button type="button" className="primary-action" onClick={isScanning ? stopScanner : startScanner}>
              {isScanning ? 'Stop' : 'Start'}
            </button>

            <label className="upload-action">
              Upload
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileScan} />
            </label>
          </div>

          <div className={`scanner-reader ${isScanning ? 'is-active' : ''}`}>
            <div id="qr-reader" />
            {!isScanning && (
              <div className="scanner-placeholder">
                <Icon type="scan" />
              </div>
            )}
          </div>
        </section>

        <aside className="scanner-result-panel" aria-live="polite">
          <span className="scanner-status">{scanStatus}</span>
          <h3>Scan Result</h3>

          {scanResult ? (
            <>
              <pre>{scanResult}</pre>
              {scanUpdate && (
                <div className={`scanner-update ${scanUpdate.changed ? 'is-sent' : 'is-unchanged'}`}>
                  <strong>{scanUpdate.bagId}</strong>
                  <span>{scanUpdate.message}</span>
                  <small>Batch: {scanUpdate.batchNumber || 'Not found'} | Status: {scanUpdate.status}</small>
                </div>
              )}
              <div className="scanner-result-actions">
                <button type="button" className="outline-action" onClick={copyResult}>Copy</button>
                {isResultUrl && (
                  <a className="outline-action scanner-link" href={scanResult} target="_blank" rel="noreferrer">
                    Open
                  </a>
                )}
              </div>
            </>
          ) : (
            <p>No QR code scanned yet.</p>
          )}

          {scanError && <p className="form-hint form-hint--error">{scanError}</p>}
        </aside>
      </div>
    </section>
  );
}

function DataTable({ columns, rows, footer, onAction }) {
  return (
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.join('-')}>
              {row.map((cell, index) => {
                const isStatus = columns[index] === 'Status';
                const isAction = columns[index] === 'Action';

                const statusClass = isStatus
                  ? String(cell).trim().toLowerCase() === 'received'
                    ? 'is-received'
                    : String(cell).trim().toLowerCase() === 'sold'
                      ? 'is-sold'
                      : String(cell).trim().toLowerCase() === 'sent'
                        ? 'is-sent'
                        : 'is-pending'
                  : '';

                return (
                  <td key={`${cell}-${index}`}>
                    {isStatus && <span className={`status-pill ${statusClass}`}>{cell}</span>}
                    {isAction && (
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => onAction?.(row, rowIndex)}
                      >
                        {cell}
                      </button>
                    )}
                    {!isStatus && !isAction && cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {footer && (
        <div className="table-footer">
          <span>{footer}</span>
          <div className="pagination">
            <button type="button">&lt;</button>
            <button type="button" className="is-current">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <span>...</span>
            <button type="button">876</button>
            <button type="button">&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LandingPage({ onLaunch }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#home" aria-label="KisanSetu home">
          <img src={process.env.PUBLIC_URL + '/kisansetu-logo.png'} alt="" />
          <span>
            <strong>KisanSetu</strong>
          </span>
        </a>
      </header>

      <main id="home">
        <section className="landing-hero">
          <div className="hero-bg-grid" aria-hidden="true" />
          <div className="hero-copy-panel">
            <p className="hero-kicker">Verified fertilizer distribution</p>
            <h1>
              Every Fertilizer Bag <span>Verified.</span><br />
              Every Transaction <span>Transparent.</span>
            </h1>
            <p>
              KisanSetu ensures tamper-proof fertilizer distribution with unique QR identity,
              government seals, and real-time tracking to protect farmers and stop black-market sales.
            </p>
            <div className="hero-actions">
              <button type="button" className="hero-primary" onClick={onLaunch}>
                Launch Platform <span aria-hidden="true">-&gt;</span>
              </button>
              <a className="hero-secondary" href="#how-it-works">
                <span aria-hidden="true">▶</span> Watch Demo
              </a>
            </div>
            <div className="trusted-row" aria-label="KisanSetu adoption">
              <span>RS</span>
              <span>AM</span>
              <span>PK</span>
              <span>NV</span>
              <p>Trusted by 500+ Dealers &amp; 10,000+ Farmers across India</p>
            </div>
          </div>

          <div className="hero-product-stage" aria-label="Verified urea bag and mobile scan preview">
            <div className="bag-visual">
              <div className="bag-top" />
              <strong>UREA</strong>
              <span>NITROGEN 46%</span>
              <div className="seal">Government<br />Verified</div>
              <div className="qr-code" aria-hidden="true">
                {Array.from({ length: 25 }).map((_, index) => (
                  <i key={index} />
                ))}
              </div>
              <small>Batch No: B2026-001<br />Serial No: 000457</small>
            </div>
            <div className="phone-visual">
              <div className="phone-speaker" />
              <div className="phone-screen">
                <div className="scan-success">Scan Successful</div>
                <div className="receipt-card">
                  <span>Product</span><strong>Urea</strong>
                  <span>Batch No.</span><strong>B2026-001</strong>
                  <span>Serial No.</span><strong>000457</strong>
                  <span>MRP</span><strong>Rs 1200</strong>
                  <span>Status</span><strong className="authentic">Authentic</strong>
                </div>
                <button type="button">Pay Now</button>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-strip" id="features">
          {[
            ['QR', 'Unique QR Code', 'Every bag has a unique digital identity.'],
            ['S', 'Serial Verification', 'Each bag is individually verifiable.'],
            ['G', 'Govt. Authentication Seal', 'Tamper-proof seal prevents duplication.'],
            ['L', 'Tamper-Proof Packaging', 'Prevents product removal before purchase.'],
            ['R', 'Real-time Tracking', 'Live updates to government dashboard.'],
          ].map(([icon, title, text]) => (
            <article key={title}>
              <span>{icon}</span>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="how-section" id="how-it-works">
          <div>
            <p className="section-kicker">How it works</p>
            <h2>End-to-End Transparency</h2>
            <div className="workflow">
              {['Manufacturer', 'Dealer Receives', 'Farmer Scans QR', 'Payment Confirmed', 'Govt. Dashboard'].map((step, index) => (
                <article key={step}>
                  <span>{index + 1}</span>
                  <strong>{step}</strong>
                  <p>{index === 0 ? 'System creates unique QR, batch and serial identity.' : index === 1 ? 'Dealer scans batch for verified delivery.' : index === 2 ? 'Farmer gets bag details, price and authenticity.' : index === 3 ? 'Farmer confirms purchase after validation.' : 'All data records in real time after payment.'}</p>
                </article>
              ))}
            </div>
          </div>
          <aside className="scan-demo-card ai-demo-card" id="security">
            <div className="demo-phone ai-orbit" aria-hidden="true">
              <div className="ai-core" />
            </div>
            <h2>AI Fraud Intelligence</h2>
            <p>KisanSetu uses AI to flag suspicious purchases, dealer stock mismatches, duplicate scans, and unusual fertilizer demand patterns before they become larger issues.</p>
          </aside>
        </section>
      </main>
    </div>
  );
}

function PortalSelectionPage({ onSelectPortal }) {
  const portals = [
    {
      id: 'government',
      title: 'Government Portal',
      subtitle: 'For Government Officials',
      tone: 'green',
      initials: 'GOV',
      points: ['Monitor distribution in real-time', 'Track transactions and detect fraud', 'Generate reports and analytics'],
    },
    {
      id: 'dealer',
      title: 'Dealer Portal',
      subtitle: 'For Dealers & Distributors',
      tone: 'blue',
      initials: 'DLR',
      points: ['Verify received batches', 'Scan and manage fertilizer bags', 'Track inventory and sales'],
    },
  ];

  return (
    <main className="portal-page">
      <section className="portal-intro">
        <a className="portal-brand" href="#home" aria-label="KisanSetu home">
          <img src={process.env.PUBLIC_URL + '/kisansetu-logo.png'} alt="" />
          <span>
            <strong>KisanSetu</strong>
            <small>Secure. Transparent. Trusted.</small>
          </span>
        </a>

        <div className="portal-welcome">
          <h1>Welcome to <span>KisanSetu</span></h1>
          <p>A secure platform for fertilizer distribution tracking, verification and transparency.</p>
          <ul>
            <li>Track every fertilizer bag in real-time</li>
            <li>Prevent fraud and black market sales</li>
            <li>Ensure farmers get the right price</li>
          </ul>
        </div>
      </section>

      <section className="portal-panel" aria-labelledby="portal-title">
        <div className="portal-heading">
          <h2 id="portal-title">Choose Your Portal</h2>
          <p>Select the portal to continue</p>
        </div>

        <div className="portal-card-grid">
          {portals.map((portal) => (
            <article className={`portal-card portal-card--${portal.tone}`} key={portal.id}>
              <span className="portal-card-icon">{portal.initials}</span>
              <h3>{portal.title}</h3>
              <p>{portal.subtitle}</p>
              <ul>
                {portal.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <button type="button" onClick={() => onSelectPortal(portal.id)}>
                Continue <span aria-hidden="true">-&gt;</span>
              </button>
            </article>
          ))}
        </div>

        <p className="portal-trust">Secure &middot; Verified &middot; Transparent</p>
      </section>
    </main>
  );
}

function App() {
  const [entryView, setEntryView] = useState(getInitialEntryView);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const metrics = useDashboardMetrics();
  const { restartTour } = useTour(governmentTourSteps, { enabled: entryView === 'dashboard' });

  const activeDetail = useMemo(
    () => detailContent[activeSection] || detailContent.dashboard,
    [activeSection]
  );

  function handlePortalSelect(portal) {
    if (portal === 'government') {
      goToGovPortal();
      return;
    }

    goToDealerPortal();
  }

  if (entryView === 'landing') {
    return <LandingPage onLaunch={() => setEntryView('portal')} />;
  }

  if (entryView === 'portal') {
    return <PortalSelectionPage onSelectPortal={handlePortalSelect} />;
  }

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} data-tour="gov-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-label="KisanSetu logo">
            <img src={process.env.PUBLIC_URL + '/kisansetu-logo.png'} alt="KisanSetu logo" className="brand-mark__logo" />
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Government dashboard navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${activeSection === item.id ? 'is-active' : ''}`}
              data-tour={item.id === 'dashboard' ? 'gov-dashboard-nav' : `gov-${item.id}`}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
            >
              <span className="sidebar-link__icon">
                <Icon type={item.icon} />
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <button type="button" className="menu-toggle" onClick={() => setSidebarOpen((current) => !current)} aria-label="Toggle navigation menu">
              <span />
              <span />
              <span />
            </button>
            <h1>Government Dashboard</h1>
            <p>Fertilizer Distribution Monitoring System</p>
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="profile-chip"
              onClick={() => setActiveSection('dashboard')}
              aria-label="Admin profile"
            >
              <span className="profile-chip__icon">
                <Icon type="user" />
              </span>
              <span>Admin</span>
              <span className="profile-chip__chevron">
                <Icon type="chevron" />
              </span>
            </button>
          </div>
        </header>

        {activeSection === 'dashboard' && (
          <DashboardPage
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            metrics={metrics}
            onRestartTour={restartTour}
          />
        )}
        {activeSection === 'add' && <AddPage />}
        {activeSection === 'records' && <PreviousPage />}
        {activeSection === 'alerts' && <AlertsPage />}
        {activeSection === 'farmers' && <FarmerRecordsPage />}
        {activeSection === 'scanner' && <ScannerPage />}
        {!['dashboard', 'add', 'records', 'alerts', 'farmers', 'scanner'].includes(activeSection) && (
          <section className="detail-panel" aria-live="polite">
            <h3>{activeDetail.title}</h3>
            <p>{activeDetail.body}</p>
            {activeSection === 'distribution' && (
              <div className="detail-metric accent-green">
                <span className="detail-metric__icon">
                  <Icon type="bag" />
                </span>
                <span>
                  <span className="detail-metric__label">Total distributed from dealer records</span>
                  <strong>{metrics.distribution === null ? 'Loading...' : formatCount(metrics.distribution)}</strong>
                  <small>Bags</small>
                </span>
              </div>
            )}
            {activeSection === 'dealers' && (
              <div className="detail-metric accent-blue">
                <span className="detail-metric__icon">
                  <Icon type="store" />
                </span>
                <span>
                  <span className="detail-metric__label">Registered dealers</span>
                  <strong>{formatCount(metrics.dealers)}</strong>
                  <small>Dealers</small>
                </span>
              </div>
            )}
            {activeSection === 'registeredFarmers' && (
              <div className="detail-metric accent-purple">
                <span className="detail-metric__icon">
                  <Icon type="farmer" />
                </span>
                <span>
                  <span className="detail-metric__label">Farmers in farmer records</span>
                  <strong>{metrics.registeredFarmers === null ? 'Loading...' : formatCount(metrics.registeredFarmers)}</strong>
                  <small>Farmers</small>
                </span>
              </div>
            )}
            {activeSection === 'activeAlerts' && (
              <div className="detail-metric accent-orange">
                <span className="detail-metric__icon">
                  <Icon type="warning" />
                </span>
                <span>
                  <span className="detail-metric__label">Unresolved alerts</span>
                  <strong>{metrics.activeAlerts === null ? 'Loading...' : formatCount(metrics.activeAlerts)}</strong>
                  <small>Alerts</small>
                </span>
              </div>
            )}
          </section>
        )}

        <footer className="footer-note">(c) 2025 Government of India. All rights reserved.</footer>
        <span data-tour="gov-tour-end" className="tour-end-anchor" aria-hidden="true" />
      </main>
    </div>
  );
}

export default App;


