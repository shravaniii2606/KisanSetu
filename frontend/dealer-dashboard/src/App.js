import { Html5Qrcode } from 'html5-qrcode';
import NewBagScannerPage from './NewBagScannerPage';
import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { PORTAL_URLS } from './portalUrls';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function goToGovPortal() {
  window.location.href = `${PORTAL_URLS.gov}?view=dashboard`;
}

function goToDealerPortal() {
  window.location.href = `${PORTAL_URLS.dealer}?view=dashboard`;
}

function getInitialEntryView() {
  const params = new URLSearchParams(window.location.search);
  return params.get('view') === 'dashboard' || window.location.hash === '#dashboard'
    ? 'dashboard'
    : 'landing';
}

function parseDecodedPayload(decodedText) {
  try {
    const parsed = JSON.parse(decodedText);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

const translations = {
  en: {
    brandTitle: 'Dealer',
    brandLabel: 'Dashboard',
    sidebarDashboard: 'Dashboard',
    sidebarScan: 'Scan batch',
    sidebarPrevious: 'Transaction history',
    sidebarSell: 'Sell',
    sidebarHistory: 'Batches Scanned',

    sidebarSettings: 'Settings',
    pageLabel: 'Dealer Dashboard',
    fertilizerDistribution: 'Fertilizer Distribution',
    trackInfo: 'Track registered farmers, scanned batches, sales and alerts in one place.',
    liveSync: 'Live Sync',
    governmentDataActive: 'Government data active',
    totalFarmersRegistered: 'Total farmers registered',
    totalScanned: 'Total scanned',
    totalSold: 'Total sold',

    view: 'View',
    processSale: 'Process Sale',
    searchFarmerByAadhar: 'Search Farmer by Aadhar',
    enterAadharPlaceholder: 'Enter 12-digit Aadhar number',
    search: 'Search',
    sampleAadhar: 'Sample Aadhar: 123456789012, 987654321098, 456789123456',
    farmerDetails: 'Farmer Details',
    name: 'Name',
    age: 'Age',
    gender: 'Gender',
    aadhar: 'Aadhar',
    phone: 'Phone',
    address: 'Address',
    fertilizerLimit: 'Fertilizer Limit',
    alreadyPurchased: 'Already Purchased',
    availableToBuy: 'Available to Buy',
    proceedToScan: 'Proceed to Scan QR Code',
    scanBatch: 'Scan Batch',
    scanBatchSubtitle: 'Scan the batch QR code to mark it as received.',
    previousRecords: 'Previous Records',
    previousRecordsSubtitle: 'View all previously received batches.',
    salesHistory: 'Sales History',
    salesHistorySubtitle: 'View all sales records.',


    featureComingSoon: 'Feature coming soon...',
    settingsTitle: 'Settings',
    selectLanguage: 'Select language',
    languageNames: {
      en: 'English',
      hi: 'हिन्दी',
      mr: 'मराठी'
    },
    settingsLanguageTab: 'Language',
    settingsDealerDetailsTab: 'Dealer Details',
    dealerInfoTitle: 'Dealer Information',
    dealerName: 'Dealer name',
    dealerPhone: 'Dealer phone',
    dealerEmail: 'Dealer email',
    dealerAddress: 'Dealer address',
    dealerAadhar: 'Dealer Aadhar',
    editDetails: 'Edit details',
    saveDetails: 'Save',
    cancel: 'Cancel',
    farmerNotFound: 'Farmer not found'
  },
  hi: {
    brandTitle: 'डीलर',
    brandLabel: 'डैशबोर्ड',
    sidebarDashboard: 'डैशबोर्ड',
    sidebarScan: 'बैच स्कैन करें',
    sidebarPrevious: 'पिछले रिकॉर्ड देखें',
    sidebarSell: 'बेचे',
    sidebarHistory: 'इतिहास',

    sidebarSettings: 'सेटिंग्स',
    pageLabel: 'डीलर डैशबोर्ड',
    fertilizerDistribution: 'उर्वरक वितरण',
    trackInfo: 'पंजीकृत किसानों, स्कैन किए गए बैच, बिक्री और अलर्ट को एक बार में ट्रैक करें।',
    liveSync: 'लाइव सिंक',
    governmentDataActive: 'सरकारी डेटा सक्रिय',
    totalFarmersRegistered: 'कुल पंजीकृत किसान',
    totalScanned: 'कुल स्कैन',
    totalSold: 'कुल बिक्री',
    activeAlerts: 'सक्रिय अलर्ट',
    view: 'देखें',
    processSale: 'बिक्री प्रक्रिया',
    searchFarmerByAadhar: 'किसान आधार से खोजें',
    enterAadharPlaceholder: '12 अंकों का आधार नंबर दर्ज करें',
    search: 'खोजें',
    sampleAadhar: 'नमूना आधार: 123456789012, 987654321098, 456789123456',
    farmerDetails: 'किसान विवरण',
    name: 'नाम',
    age: 'उम्र',
    gender: 'लिंग',
    aadhar: 'आधार',
    phone: 'फोन',
    address: 'पता',
    fertilizerLimit: 'उर्वरक सीमा',
    alreadyPurchased: 'पहले से खरीदा',
    availableToBuy: 'खरीदने के लिए उपलब्ध',
    proceedToScan: 'QR कोड स्कैन करने के लिए आगे बढ़ें',
    scanBatch: 'बैच स्कैन करें',
    scanBatchSubtitle: 'स्कैन करें बॅच QR कोड मार्क करने के लिए प्राप्त किया गया।',
    previousRecords: 'पिछले रिकॉर्ड',
    previousRecordsSubtitle: 'पहले प्राप्त किए गए बैच देखें।',
    salesHistory: 'विक्री इतिहास',
    salesHistorySubtitle: 'सभी बिक्री रिकॉर्ड देखें।',
    alertsTitle: 'अलर्ट',
    alertsSubtitle: 'सभी सक्रिय अलर्ट देखें।',
    featureComingSoon: 'फ़ीचर जल्द आ रहा है...',
    settingsTitle: 'सेटिंग्स',
    selectLanguage: 'भाषा चुनें',
    languageNames: {
      en: 'English',
      hi: 'हिन्दी',
      mr: 'मराठी'
    },
    settingsLanguageTab: 'भाषा',
    settingsDealerDetailsTab: 'डीलर विवरण',
    dealerInfoTitle: 'डीलर जानकारी',
    dealerName: 'डीलर का नाम',
    dealerPhone: 'डीलर फोन',
    dealerEmail: 'डीलर ईमेल',
    dealerAddress: 'डीलर पता',
    dealerAadhar: 'डीलर आधार',
    editDetails: 'विवरण संपादित करें',
    saveDetails: 'सहेजें',
    cancel: 'रद्द करें',
    farmerNotFound: 'किसान नहीं मिला'
  },
  mr: {
    brandTitle: 'डीलर',
    brandLabel: 'डॅशबोर्ड',
    sidebarDashboard: 'डॅशबोर्ड',
    sidebarScan: 'बॅच स्कॅन करा',
    sidebarPrevious: 'मागील नोंदी पहा',
    sidebarSell: 'विक्री',
    sidebarHistory: 'इतिहास',

    sidebarSettings: 'सेटिंग्ज',
    pageLabel: 'डीलर डॅशबोर्ड',
    fertilizerDistribution: 'खते वितरण',
    trackInfo: 'नोंदणीकृत शेतकरी, स्कॅन केलेली बॅच, विक्री आणि अलर्ट एकाच ठिकाणी ट्रॅक करा.',
    liveSync: 'लाइव्ह सिंक',
    governmentDataActive: 'सरकारी डेटा सक्रिय',
    totalFarmersRegistered: 'एकूण नोंदणीकृत शेतकरी',
    totalScanned: 'एकूण स्कॅन',
    totalSold: 'एकूण विक्री',
    activeAlerts: 'सक्रिय अलर्ट',
    view: 'पहा',
    processSale: 'विक्री प्रक्रिया',
    searchFarmerByAadhar: 'शेतकऱ्याचा आधार शोधा',
    enterAadharPlaceholder: '12 अंकी आधार क्रमांक प्रविष्ट करा',
    search: 'शोधा',
    sampleAadhar: 'नमुना आधार: 123456789012, 987654321098, 456789123456',
    farmerDetails: 'शेतकरी तपशील',
    name: 'नाव',
    age: 'वय',
    gender: 'लिंग',
    aadhar: 'आधार',
    phone: 'फोन',
    address: 'पत्ता',
    fertilizerLimit: 'खते मर्यादा',
    alreadyPurchased: 'आधीच विकत घेतले',
    availableToBuy: 'खरेदी करण्यासाठी उपलब्ध',
    proceedToScan: 'QR कोड स्कॅन करण्यासाठी पुढे जा',
    scanBatch: 'बॅच स्कॅन करा',
    scanBatchSubtitle: 'सूळ करा बॅच QR कोड प्राप्त झाले म्हणून मार्क करा.',
    previousRecords: 'मागील नोंदी',
    previousRecordsSubtitle: 'पूर्वी प्राप्त केलेल्या बॅच पहा.',
    salesHistory: 'विक्री इतिहास',
    salesHistorySubtitle: 'सर्व विक्री नोंदी पहा.',
    alertsTitle: 'अलर्ट',
    alertsSubtitle: 'सर्व सक्रिय अलर्ट पहा.',
    featureComingSoon: 'वैशिष्ट्य लवकरच येणार आहे...',
    settingsTitle: 'सेटिंग्ज',
    selectLanguage: 'भाषा निवडा',
    languageNames: {
      en: 'English',
      hi: 'हिन्दी',
      mr: 'मराठी'
    },
    settingsLanguageTab: 'भाषा',
    settingsDealerDetailsTab: 'डीलर तपशील',
    dealerInfoTitle: 'डीलर माहिती',
    dealerName: 'डीलर नाव',
    dealerPhone: 'डीलर फोन',
    dealerEmail: 'डीलर ईमेल',
    dealerAddress: 'डीलर पत्ता',
    dealerAadhar: 'डीलर आधार',
    editDetails: 'तपशील संपादित करा',
    saveDetails: 'जतन करा',
    cancel: 'रद्द करा',
    farmerNotFound: 'शेतकरी सापडला नाही'
  }
};

async function readJsonResponse(response) {
  const responseText = await response.text();

  try {
    return responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error(`Server returned ${response.status} ${response.statusText} instead of JSON.`);
  }
}

function ScanIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 12h10" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}

function resizeImage(file, maxDimension) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, file.type || 'image/jpeg');
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function ScannerPage(props) {
  const { dealerDetails, loadScanRecords, loadDashboardStats } = props;
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

  async function handleScanSuccess(decodedText) {
    if (scanRequestRef.current) return;

    scanRequestRef.current = true;
    setScanResult(decodedText);
    setScanUpdate(null);
    setScanError('');
    setScanStatus('Updating bag status');

    try {
      if (scannerRef.current?.isScanning) {
        await stopScanner();
      }

      // Try to parse JSON payload
      const parsed = parseDecodedPayload(decodedText);
      const bagId = parsed.bagId || parsed.bag_id || '';
      const batchNumber = parsed.batchNumber || parsed.batch_number || '';

      let body;
      if (batchNumber) {
        // Batch QR scan
        body = {
          batchNumber,
          scannedBy: 'dealer',
          dealer_name: dealerDetails?.name || null,
          location: dealerDetails?.address || null,
        };
      } else if (bagId) {
        // Individual bag scan
        body = {
          bagId,
          scannedBy: 'dealer',
          dealer_name: dealerDetails?.name || null,
          location: dealerDetails?.address || null,
        };
      } else {
        throw new Error('The scanned QR code does not contain a bag ID or batch number.');
      }

      const response = await fetch(`${API_BASE_URL}/api/batches/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update status.');
      }

      setScanUpdate(result);
      if (body.batchNumber) {
        setScanStatus(result.changed ? 'Marked received' : 'Batch already received');
      } else {
        setScanStatus(result.changed ? 'Marked received' : 'Bag received already');
      }

      // The backend automatically logs the scan to dealer_scan_records now.
      // Refresh local scan records so View Previous reflects the latest data.
      loadScanRecords();
      loadDashboardStats();

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

          <button
            type="button"
            className="scanner-btn"
            onClick={isScanning ? stopScanner : startScanner}
          >
            {isScanning ? 'Stop QR Scan' : 'Start QR Scan'}
          </button>

          <label className="scanner-btn">
            Upload QR Image
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileScan}
              hidden
            />
          </label>
        </div>

        <div className={`scanner-reader ${isScanning ? 'is-active' : ''}`}>
          <div id="qr-reader" />
          {!isScanning && (
            <div className="scanner-placeholder">
              <ScanIcon />
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
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const dealerDetailsByLanguage = {
    en: {
      name: 'Raj Singh Dealer',
      phone: '+91 98765 43210',
      email: 'dealer@example.com',
      address: 'Village Nandpur, Taluka Indore, District Indore, Madhya Pradesh',
      aadhar: '1234 5678 9012'
    },
    hi: {
      name: 'राज सिंह डीलर',
      phone: '+91 98765 43210',
      email: 'dealer@example.com',
      address: 'ग्राम नंदपुर, तालुका इंदौर, जिला इंदौर, मध्य प्रदेश',
      aadhar: '1234 5678 9012'
    },
    mr: {
      name: 'राज सिंग डीलर',
      phone: '+91 98765 43210',
      email: 'dealer@example.com',
      address: 'वाडा नंदपूर, तालुका इंदूर, जिल्हा इंदूर, मध्य प्रदेश',
      aadhar: '1234 5678 9012'
    }
  };

  const [language, setLanguage] = useState('en');
  const [settingsView, setSettingsView] = useState('language');
  const [aadharInput, setAadharInput] = useState('');
  const [farmerData, setFarmerData] = useState(null);
  const [farmerCount, setFarmerCount] = useState(null);
  const [totalBagsScanned, setTotalBagsScanned] = useState(null);
  const [totalBagsSold, setTotalBagsSold] = useState(null);
  const [dealerDetails, setDealerDetails] = useState(dealerDetailsByLanguage.en);
  const [isEditingDealer, setIsEditingDealer] = useState(false);
  const [scanRecords, setScanRecords] = useState([]);
  const [batchScanSummaries, setBatchScanSummaries] = useState([]);
  const [batchTotalsByNumber, setBatchTotalsByNumber] = useState({});
  const [saleHistory, setSaleHistory] = useState([]);
  const [saleHistoryStatus, setSaleHistoryStatus] = useState({ status: 'idle', message: '' });
  const [recordsStatus, setRecordsStatus] = useState({
    status: 'idle',
    message: '',
  });
  const [selectedScanRecord, setSelectedScanRecord] = useState(null);
  const texts = translations[language];

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setIsSidebarOpen(false);
  };

  const digitMap = {
    hi: { 0: '०', 1: '१', 2: '२', 3: '३', 4: '४', 5: '५', 6: '६', 7: '७', 8: '८', 9: '९' },
    mr: { 0: '०', 1: '१', 2: '२', 3: '३', 4: '४', 5: '५', 6: '६', 7: '७', 8: '८', 9: '९' }
  };

  const localizeDigits = (value) => {
    if (language === 'en' || value === null || value === undefined) return value;
    return String(value).replace(/\d/g, (digit) => digitMap[language][digit] ?? digit);
  };

  const formatDateTime = (value) => {
    if (!value) return 'N/A';
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  };

  const searchFarmer = async () => {
    if (!aadharInput) {
      alert('Please enter Aadhar ID');
      return;
    }
    try {
      // Use the same endpoint as gov dashboard — returns calculated limit
      const response = await fetch(`${API_BASE_URL}/api/farmer-records/${aadharInput}`);
      if (response.status === 404) {
        setFarmerData(null);
        alert(texts.farmerNotFound);
        return;
      }
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error fetching farmer');
      }
      const payload = await response.json();
      const farmer = { ...payload.farmer, aadhar: payload.farmer.aadhar_id };

      // Fetch purchased amount from transactions
      let purchased = 0;
      try {
        const txRes = await fetch(`${API_BASE_URL}/api/farmer-transactions/${aadharInput}`);
        if (txRes.ok) {
          const txPayload = await txRes.json();
          purchased = (txPayload.transactions || []).reduce(
            (sum, tx) => sum + (tx.quantity_kg || 0), 0
          );
        }
      } catch (e) {
        console.warn('Could not load transactions:', e);
      }

      setFarmerData({ ...farmer, purchased });
    } catch (err) {
      console.error(err);
      alert(err.message);
      setFarmerData(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchFarmer();
    }
  };

  const handleLanguageChange = (langKey) => {
    setLanguage(langKey);
    setDealerDetails(dealerDetailsByLanguage[langKey]);
  };

  const updateDealerDetail = (field, value) => {
    setDealerDetails((prev) => ({ ...prev, [field]: value }));
  };

  const loadDashboardStats = useCallback(async () => {
    fetch(`${API_BASE_URL}/api/farmers/count`)
      .then(res => res.json())
      .then(data => setFarmerCount(data.count ?? 0))
      .catch(() => setFarmerCount(0));

    const dealerQuery = dealerDetails?.id ? `?dealer_id=${encodeURIComponent(dealerDetails.id)}` : '';

    fetch(`${API_BASE_URL}/api/scan-records/total-bags${dealerQuery}`)
      .then(res => res.json())
      .then(data => setTotalBagsScanned(data.total ?? 0))
      .catch(() => setTotalBagsScanned(0));

    fetch(`${API_BASE_URL}/api/scan-records/total-sold${dealerQuery}`)
      .then(res => res.json())
      .then(data => setTotalBagsSold(data.total ?? 0))
      .catch(() => setTotalBagsSold(0));
  }, [dealerDetails?.id]);

  const loadScanRecords = async () => {
    try {
      setRecordsStatus({ status: 'loading', message: 'Loading previous scan records...' });

      const [scanResponse, batchResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/scan-records`),
        fetch(`${API_BASE_URL}/api/batches`),
      ]);
      const scanPayload = await readJsonResponse(scanResponse);
      const batchPayload = await readJsonResponse(batchResponse);

      if (!scanResponse.ok) {
        throw new Error(scanPayload.error || 'Unable to load previous scan records.');
      }

      if (!batchResponse.ok) {
        throw new Error(batchPayload.error || 'Unable to load batch totals.');
      }

      const records = scanPayload.scanRecords || [];
      const latestScanByBatch = records.reduce((map, record) => {
        if (!record.batch_number) return map;
        const previous = map[record.batch_number];
        if (!previous || new Date(record.scanned_at) > new Date(previous.scanned_at)) {
          map[record.batch_number] = record;
        }
        return map;
      }, {});
      const batchTotals = (batchPayload.batches || []).reduce((map, batch) => {
        if (batch && batch.batch_number) {
          map[batch.batch_number] = Number(batch.number_of_bags) || 0;
        }
        return map;
      }, {});
      const summaries = (batchPayload.batches || [])
        .map((batch) => {
          const qrCodes = Array.isArray(batch.qr_codes) ? batch.qr_codes : [];
          const bagsScanned = qrCodes.filter((qrCode) => {
            const status = qrCode?.status === 'receive' ? 'received' : qrCode?.status;
            return status === 'received' || status === 'sold';
          }).length;

          if (!bagsScanned) return null;

          const latestScan = latestScanByBatch[batch.batch_number];
          return {
            id: batch.id,
            batch_number: batch.batch_number,
            product_name: batch.product_name,
            bag_weight: batch.bag_weight,
            scanned_at: latestScan?.scanned_at || batch.created_at,
            bagsScanned,
            totalBags: Number(batch.number_of_bags) || qrCodes.length || bagsScanned,
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));

      setBatchTotalsByNumber(batchTotals);
      setBatchScanSummaries(summaries);
      setScanRecords(records);
      setRecordsStatus({
        status: 'success',
        message: records.length || summaries.length ? '' : 'No scanned batch records yet.',
      });
    } catch (error) {
      setRecordsStatus({
        status: 'error',
        message: error.message || 'Unable to load previous scan records.',
      });
    }
  };
  const loadSaleHistory = async () => {
    try {
      setSaleHistoryStatus({ status: 'loading', message: 'Loading sales history...' });
      const response = await fetch(`${API_BASE_URL}/api/farmer-transactions`);
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error || 'Unable to load sales history.');
      setSaleHistory(payload.transactions || []);
      setSaleHistoryStatus({ status: 'success', message: '' });
    } catch (error) {
      setSaleHistoryStatus({ status: 'error', message: error.message });
    }
  };
  async function saveScanRecord(decodedText, batch, extraInfo = {}) {
    try {
      const decodedPayload = parseDecodedPayload(decodedText);
      const response = await fetch(`${API_BASE_URL}/api/scan-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decodedText,
          decodedPayload,
          batch,
          dealer_id: dealerDetails?.id || null,
          dealer_name: dealerDetails?.name || null,
          location: dealerDetails?.address || null,
          ...extraInfo,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save scan record.');
      }

      setScanRecords((records) => [payload.scanRecord, ...records]);
    } catch (error) {
      console.error(error.message || 'Scan record saving failed.');
    }
  }
  useEffect(() => {
    loadDashboardStats();
    loadScanRecords();
  }, [dealerDetails?.id, loadDashboardStats]);
  useEffect(() => {
    if (currentPage === 'previous' || currentPage === 'history') loadScanRecords();
  }, [currentPage]);

  function handlePortalSelect(portal) {
    if (portal === 'dealer') {
      goToDealerPortal();
      return;
    }

    goToGovPortal();
  }

  if (entryView === 'landing') {
    return <LandingPage onLaunch={() => setEntryView('portal')} />;
  }

  if (entryView === 'portal') {
    return <PortalSelectionPage onSelectPortal={handlePortalSelect} />;
  }

  return (
    <div className="dealer-dashboard">
      <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <img src={process.env.PUBLIC_URL + '/kisansetu-logo.png'} alt="KisanSetu logo" className="brand-mark__logo" />
          </div>
          <div>
            <h1>{texts.brandTitle}</h1>
            <p>{texts.brandLabel}</p>
          </div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavigate('dashboard')}>{texts.sidebarDashboard}</button>
          <button className={`nav-item ${currentPage === 'scan' ? 'active' : ''}`} onClick={() => handleNavigate('scan')}>{texts.sidebarScan}</button>
          <button className={`nav-item ${currentPage === 'previous' ? 'active' : ''}`} onClick={() => handleNavigate('previous')}>{texts.sidebarPrevious}</button>
          <button className={`nav-item ${currentPage === 'sell' ? 'active' : ''}`} onClick={() => handleNavigate('sell')}>{texts.sidebarSell}</button>
          <button className={`nav-item ${currentPage === 'history' ? 'active' : ''}`} onClick={() => handleNavigate('history')}>{texts.sidebarHistory}</button>

          <button className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`} onClick={() => handleNavigate('settings')}>{texts.sidebarSettings}</button>
        </nav>
      </aside>

      <div className={`mobile-nav-overlay ${isSidebarOpen ? 'is-open' : ''}`} onClick={() => setIsSidebarOpen(false)} />

      <main className="main-panel">
        <button
          type="button"
          className={`mobile-nav-toggle${isSidebarOpen ? ' open' : ''}`}
          onClick={() => setIsSidebarOpen((open) => !open)}
          aria-label="Toggle navigation"
          aria-expanded={isSidebarOpen}
        >
          <span />
          <span />
          <span />
        </button>
        {currentPage === 'dashboard' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>{texts.fertilizerDistribution}</h2>
                <p className="subtitle">
                  {texts.trackInfo}
                </p>
              </div>
              <div className="header-card">
                <span className="header-icon">⚡</span>
                <div>
                  <p>{texts.liveSync}</p>
                  <strong>{texts.governmentDataActive}</strong>
                </div>
              </div>
            </header>

            <section className="section stats-row">
              <div className="stat-card card-green">
                <span className="stat-icon">👨‍🌾</span>
                <div>
                  <p>{texts.totalFarmersRegistered}</p>
                  <strong>{localizeDigits(farmerCount ?? '...')}</strong>
                  <span style={{ fontSize: '0.94rem', color: '#334155', marginTop: '8px', display: 'block' }}>Farmers</span>
                </div>
              </div>

              <div className="stat-card card-blue">
                <span className="stat-icon">📦</span>
                <div>
                  <p>{texts.totalScanned}</p>
                  <strong>{localizeDigits(totalBagsScanned ?? '...')}</strong>
                </div>
              </div>

              <div className="stat-card card-orange">
                <span className="stat-icon">🛒</span>
                <div>
                  <p>{texts.totalSold}</p>
                  <strong>{localizeDigits(totalBagsSold ?? '...')}</strong>
                </div>
              </div>



            </section>
          </>
        )}

        {currentPage === 'sell' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>{texts.processSale}</h2>
                <p className="subtitle">
                  {texts.searchFarmerByAadhar}
                </p>
              </div>
            </header>

            <section className="sell-section">
              <div className="search-card">
                <h3>{texts.searchFarmerByAadhar}</h3>
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder={localizeDigits(texts.enterAadharPlaceholder)}
                    value={aadharInput}
                    onChange={(e) => setAadharInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    maxLength="12"
                  />
                  <button onClick={searchFarmer} className="search-button">{texts.search}</button>
                </div>
                <p className="search-hint">{localizeDigits(texts.sampleAadhar)}</p>
              </div>

              {farmerData && (
                <div className="farmer-details-card">
                  <h3>{texts.farmerDetails}</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">{texts.name}</span>
                      <span className="value">{farmerData.name || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">{texts.aadhar}</span>
                      <span className="value">{localizeDigits(farmerData.aadhar_id || farmerData.aadhar) || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Village</span>
                      <span className="value">{farmerData.village || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">District</span>
                      <span className="value">{farmerData.district || '—'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Phone</span>
                      <span className="value">{farmerData.phone || 'Not set'}</span>
                    </div>
                    <div className="detail-item limit-info">
                      <span className="label">{texts.fertilizerLimit}</span>
                      <span className="value">{localizeDigits(farmerData.limit ?? 0)} kg</span>
                    </div>
                    <div className="detail-item purchased-info">
                      <span className="label">{texts.alreadyPurchased}</span>
                      <span className="value">{localizeDigits(farmerData.purchased ?? 0)} kg</span>
                    </div>
                    <div className="detail-item available-info">
                      <span className="label">{texts.availableToBuy}</span>
                      <span className="value">
                        {localizeDigits((farmerData.limit ?? 0) - (farmerData.purchased ?? 0))} kg
                      </span>
                    </div>
                  </div>
                  <button className="proceed-button" onClick={() => setCurrentPage('bagScan')}>
                    {texts.proceedToScan}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        {currentPage === 'bagScan' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>{texts.scanBatch}</h2>
                <p className="subtitle">{texts.scanBatchSubtitle}</p>
              </div>
            </header>

            <NewBagScannerPage
              setCurrentPage={setCurrentPage}
              farmerData={farmerData}
              onPurchaseComplete={loadDashboardStats}
            />
          </>
        )}

        {currentPage === 'history' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>Batches Scanned</h2>
                <p className="subtitle">
                  All batches and bags scanned by dealer.
                </p>
              </div>
            </header>

            <section className="records-section">
              {recordsStatus.status === 'loading' && (
                <p className="records-message">{recordsStatus.message}</p>
              )}

              {recordsStatus.status === 'error' && (
                <p className="records-message error">{recordsStatus.message}</p>
              )}

              {recordsStatus.status === 'success' &&
                batchScanSummaries.length === 0 && (
                  <p className="records-message">
                    No scanned records yet.
                  </p>
                )}

              {batchScanSummaries.length > 0 && (
                    <div className="records-table-wrap">
                      <table className="records-table">
                        <thead>
                          <tr>
                            <th>Scanned At</th>
                            <th>Batch Number</th>
                            <th>Product</th>
                            <th>Bag Weight</th>
                            <th>Bags Scanned</th>
                            <th>Total Bags</th>
                          </tr>
                        </thead>

                        <tbody>
                          {batchScanSummaries.map((record) => (
                            <tr
                              key={
                                record.batch_number || record.id
                              }
                            >
                              <td data-label="Scanned At">
                                {formatDateTime(
                                  record.scanned_at
                                )}
                              </td>
                              <td data-label="Batch Number">
                                {record.batch_number || "N/A"}
                              </td>
                              <td data-label="Product">
                                {record.product_name || "N/A"}
                              </td>
                              <td data-label="Bag Weight">
                                {record.bag_weight || "N/A"}
                              </td>
                              <td data-label="Bags Scanned">{record.bagsScanned}</td>
                              <td data-label="Total Bags">{record.totalBags}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              )}
            </section>
          </>
        )}


        {currentPage === 'scan' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>{texts.scanBatch}</h2>
                <p className="subtitle">{texts.scanBatchSubtitle}</p>
              </div>
            </header>
            <ScannerPage
              dealerDetails={dealerDetails}
              loadScanRecords={loadScanRecords}
              loadDashboardStats={loadDashboardStats}
            />
          </>
        )}

        {currentPage === 'previous' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                {selectedScanRecord ? (
                  <>
                    <h2>Sale Details</h2>
                    <p className="subtitle">Bag and farmer information for this transaction</p>
                  </>
                ) : (
                  <>
                    <h2>{texts.previousRecords}</h2>
                    <p className="subtitle">{texts.previousRecordsSubtitle}</p>
                  </>
                )}
              </div>
              {selectedScanRecord && (
                <button className="outline-action" onClick={() => setSelectedScanRecord(null)}>
                  ← Back to Records
                </button>
              )}
            </header>

            {selectedScanRecord ? (
              /* ── DETAIL PAGE ── */
              <section className="page-content">
                <div className="batch-detail-grid" style={{ marginBottom: '24px' }}>
                  <div><span>Bag ID: </span><strong>{selectedScanRecord.bag_id || '—'}</strong></div>
                  <div><span>Batch Number: </span><strong>{selectedScanRecord.batch_number || '—'}</strong></div>
                  <div><span>Product: </span><strong>{selectedScanRecord.product_name || '—'}</strong></div>
                  <div><span>Weight: </span><strong>{selectedScanRecord.bag_weight || '—'}</strong></div>
                  <div><span>Status: </span><strong>{selectedScanRecord.status || '—'}</strong></div>
                  <div><span>Sold At: </span><strong>{formatDateTime(selectedScanRecord.scanned_at)}</strong></div>
                </div>

                <hr style={{ margin: '0 0 24px', opacity: 0.15 }} />

                <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Farmer Details</h3>
                <div className="batch-detail-grid">
                  <div><span>Aadhar ID: </span><strong>{selectedScanRecord.farmer_aadhar_id || '—'}</strong></div>
                  <div><span>Name: </span><strong>{selectedScanRecord.farmer_name || '—'}</strong></div>
                  <div><span>Village: </span><strong>{selectedScanRecord.farmer_village || '—'}</strong></div>
                  <div><span>District: </span><strong>{selectedScanRecord.farmer_district || '—'}</strong></div>
                </div>
              </section>

            ) : (
              /* ── TABLE PAGE ── */
              <section className="records-section">
                {recordsStatus.status === 'loading' && <p className="records-message">{recordsStatus.message}</p>}
                {recordsStatus.status === 'error' && <p className="records-message error">{recordsStatus.message}</p>}
                {recordsStatus.status === 'success' && scanRecords.length === 0 && (
                  <p className="records-message">{recordsStatus.message}</p>
                )}
                {scanRecords.length > 0 && (
                  <div className="records-table-wrap">
                    <table className="records-table">
                      <thead>
                        <tr>
                          <th>Scanned At: </th>
                          <th>Bag ID: </th>
                          <th>Batch Number: </th>
                          <th>Product: </th>
                          <th>Weight: </th>
                          <th>Action: </th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanRecords.map((record) => (
                          <tr key={record.id}>
                            <td data-label="Scanned At">{formatDateTime(record.scanned_at)}</td>
                            <td data-label="Bag ID"><span className="record-chip">{record.bag_id || 'N/A'}</span></td>
                            <td data-label="Batch Number">{record.batch_number || 'N/A'}</td>
                            <td data-label="Product">{record.product_name || 'N/A'}</td>
                            <td data-label="Weight">{record.bag_weight || 'N/A'}</td>
                            <td data-label="Action">
                              {record.farmer_aadhar_id ? (
                                <button
                                  className="search-button"
                                  style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                  onClick={() => setSelectedScanRecord(record)}
                                >
                                  View Details
                                </button>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}







        {currentPage === 'settings' && (
          <>
            <header className="top-bar">
              <div>
                <p className="page-label">{texts.pageLabel}</p>
                <h2>{texts.settingsTitle}</h2>
                <p className="subtitle">
                  {settingsView === 'language' ? texts.selectLanguage : texts.dealerInfoTitle}
                </p>
              </div>
            </header>
            <section className="settings-section">
              <div className="settings-card">
                <div className="settings-tabs">
                  <button
                    className={`settings-tab ${settingsView === 'language' ? 'active' : ''}`}
                    onClick={() => setSettingsView('language')}
                  >
                    {texts.settingsLanguageTab}
                  </button>
                  <button
                    className={`settings-tab ${settingsView === 'dealer' ? 'active' : ''}`}
                    onClick={() => setSettingsView('dealer')}
                  >
                    {texts.settingsDealerDetailsTab}
                  </button>
                </div>

                {settingsView === 'language' ? (
                  <div className="language-panel">
                    <h3>{texts.selectLanguage}</h3>
                    <div className="language-options">
                      {Object.entries(texts.languageNames).map(([langKey, langLabel]) => (
                        <button
                          key={langKey}
                          className={`language-button ${language === langKey ? 'active' : ''}`}
                          onClick={() => handleLanguageChange(langKey)}
                        >
                          {langLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="dealer-details-panel">
                    <h3>{texts.dealerInfoTitle}</h3>
                    {isEditingDealer ? (
                      <div className="dealer-edit-form">
                        <label>
                          {texts.dealerName}
                          <input
                            value={dealerDetails.name}
                            onChange={(e) => updateDealerDetail('name', e.target.value)}
                          />
                        </label>
                        <label>
                          {texts.dealerPhone}
                          <input
                            value={dealerDetails.phone}
                            onChange={(e) => updateDealerDetail('phone', e.target.value)}
                          />
                        </label>
                        <label>
                          {texts.dealerEmail}
                          <input
                            value={dealerDetails.email}
                            onChange={(e) => updateDealerDetail('email', e.target.value)}
                          />
                        </label>
                        <label>
                          {texts.dealerAadhar}
                          <input
                            value={dealerDetails.aadhar}
                            onChange={(e) => updateDealerDetail('aadhar', e.target.value)}
                          />
                        </label>
                        <label>
                          {texts.dealerAddress}
                          <input
                            value={dealerDetails.address}
                            onChange={(e) => updateDealerDetail('address', e.target.value)}
                          />
                        </label>
                        <div className="form-actions">
                          <button className="cancel-button" onClick={() => setIsEditingDealer(false)}>{texts.cancel}</button>
                          <button className="save-button" onClick={() => setIsEditingDealer(false)}>{texts.saveDetails}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="dealer-details-view">
                        <div className="detail-row detail-primary">
                          <strong>{dealerDetails.name}</strong>
                          <span>{texts.dealerName}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{localizeDigits(dealerDetails.phone)}</strong>
                          <span>{texts.dealerPhone}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{dealerDetails.email}</strong>
                          <span>{texts.dealerEmail}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{localizeDigits(dealerDetails.aadhar)}</strong>
                          <span>{texts.dealerAadhar}</span>
                        </div>
                        <div className="detail-row">
                          <strong>{dealerDetails.address}</strong>
                          <span>{texts.dealerAddress}</span>
                        </div>
                        <button className="edit-button" onClick={() => setIsEditingDealer(true)}>{texts.editDetails}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
