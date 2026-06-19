import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const API_BASE_URL = "https://fertilizers-oz5a.onrender.com";

const parseBagPrice = (value) => {
  if (value == null) return 0;
  const number = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (value) => {
  const amount = Number(value) || 0;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const parseJson = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

export default function NewBagScannerPage({ setCurrentPage, farmerData: initialFarmerData }) {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scanRequestRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('Ready');
  const [scanError, setScanError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedBags, setScannedBags] = useState([]);
  const [farmerData, setFarmerData] = useState(initialFarmerData || null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

    const getBagPrice = (bag) => {
    return bag.product_price ?? bag.productPrice ?? bag.price ?? bag.batch_product_price ?? bag.batchPrice ?? 0;
  };

  const totalAmount = scannedBags.reduce((sum, bag) => sum + parseBagPrice(getBagPrice(bag)), 0);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    if (!farmerData) {
      setOtpError('Select a farmer before sending OTP.');
      return;
    }

    if (!scannedBags.length) {
      setScanError('Scan at least one bag before sending OTP.');
      return;
    }

    setSendingOtp(true);
    setOtpError(null);

    try {
      const aadhar = farmerData?.aadhar_id || farmerData?.aadhar;
      const response = await fetch(`${API_BASE_URL}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhar }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setOtpCountdown(30);
      setScanStatus('OTP sent. Enter OTP to confirm purchase.');
    } catch (e) {
      setOtpError(e.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyAndPurchase = async () => {
    if (!scannedBags.length) {
      setScanError('No bags in cart to purchase.');
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const aadhar = farmerData?.aadhar_id || farmerData?.aadhar;
      const response = await fetch(`${API_BASE_URL}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhar, otp: otpInput }),
      });

      const data = await response.json();
      if (!response.ok || !data.verified) {
        throw new Error(data.error || 'Invalid OTP');
      }

      await handlePurchaseAll();
    } catch (e) {
      setOtpError(e.message || 'OTP verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const fetchBagById = async (bagId) => {
    const res = await fetch(`${API_BASE_URL}/api/bags/${bagId}`);
    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Bag not found');
    }
    return data;
  };

  const fetchFarmerByAadhar = async (aadhar) => {
    const res = await fetch(`${API_BASE_URL}/api/farmers/${aadhar}`);
    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Farmer not found');
    }
    return data;
  };

  const handleSuccess = async (decodedText) => {
    if (scanRequestRef.current) return;
    scanRequestRef.current = true;
    setScanStatus('Fetching bag details...');
    setScanError('');
    setLoading(true);

    try {
      const payload = JSON.parse(decodedText);
      const bagIds = [];

      if (payload.bagIds && Array.isArray(payload.bagIds)) {
        bagIds.push(...payload.bagIds.filter(Boolean));
      } else if (payload.bagId) {
        bagIds.push(payload.bagId);
      }

      if (!bagIds.length) {
        throw new Error('QR payload does not include a bag ID.');
      }

      const newBags = [];
      const currentFarmerAadhar = farmerData?.aadhar_id || farmerData?.aadhar;

      for (const bagId of bagIds) {
        if (!bagId) continue;
        if (scannedBags.some((bag) => bag.id === bagId)) {
          setScanError(`Bag ${bagId} is already added to the bill.`);
          continue;
        }

        const bag = await fetchBagById(bagId);
        if (bag.status === 'sold') {
          setScanError(`Bag ${bagId} is already sold.`);
          continue;
        }

        const scannedFarmerAadhar = bag.aadhar || bag.aadhar_id;
        if (currentFarmerAadhar && scannedFarmerAadhar && scannedFarmerAadhar !== currentFarmerAadhar) {
          setScanError(`Bag ${bagId} belongs to another farmer.`);
          continue;
        }

        if (!currentFarmerAadhar && scannedFarmerAadhar) {
          const farmer = await fetchFarmerByAadhar(scannedFarmerAadhar);
          setFarmerData(farmer.farmer || farmer);
        }

        const fallbackPrice = bag.product_price ?? bag.productPrice ?? bag.price ?? payload.productPrice ?? payload.price ?? null;
        newBags.push({
          ...bag,
          product_price: fallbackPrice,
          productPrice: fallbackPrice,
          batch_product_price: bag.batch_product_price ?? bag.batchPrice ?? fallbackPrice,
          batchPrice: bag.batchPrice ?? bag.batch_product_price ?? fallbackPrice,
        });
      }

      if (newBags.length) {
        setScannedBags((prev) => {
          const uniqueBags = [...prev];
          newBags.forEach((bag) => {
            if (!uniqueBags.some((item) => item.id === bag.id)) {
              uniqueBags.push(bag);
            }
          });
          return uniqueBags;
        });
        setScanStatus(`Added ${newBags.length} bag(s) to bill.`);
      } else {
        setScanStatus('No new bags added.');
      }
    } catch (error) {
      setScanError(error?.message || 'Unable to scan bag.');
      setScanStatus('Scan failed');
    } finally {
      setLoading(false);
      scanRequestRef.current = false;
    }
  };

  const startScanner = async () => {
    if (scannerRef.current) return;
    setScanError('');
    setScanStatus('Starting camera');

    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleSuccess(decodedText)
      );

      setScanning(true);
      setScanStatus('Scanning');
    } catch (error) {
      setScanError(error?.message || 'Unable to start scanner.');
      setScanning(false);
      setScanStatus('Camera unavailable');
    }
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }

    scanner.clear();
    scannerRef.current = null;
    setScanning(false);
    setScanStatus('Scanner stopped');
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setScanError('');
    setScanStatus('Reading image');

    try {
      const scanner = await getScanner();
      if (scanner.isScanning) await stopScanner();

      let decodedText = null;
      try {
        decodedText = await scanner.scanFile(file, true);
      } catch {
        decodedText = null;
      }

      if (!decodedText) {
        throw new Error('No QR code could be read from this image.');
      }

      await handleSuccess(decodedText);
    } catch (error) {
      setScanStatus('No QR found');
      setScanError(error?.message || 'No QR code could be read.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-reader');
    }

    return scannerRef.current;
  };

  const removeScannedBag = (bagId) => {
    setScannedBags((prev) => prev.filter((bag) => bag.id !== bagId));
  };

  const purchaseBag = async (bagId) => {
    const aadharToUse = farmerData?.aadhar_id || farmerData?.aadhar;
    const res = await fetch(`${API_BASE_URL}/api/bags/${bagId}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmer_aadhar: aadharToUse }),
    });

    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(data.error || `Purchase failed for bag ${bagId}`);
    }
    return data;
  };

  const handlePurchaseAll = async () => {
    if (!scannedBags.length) {
      setScanError('No bags selected for purchase.');
      return;
    }

    setLoading(true);
    setScanError('');

    const failures = [];
    for (const bag of scannedBags) {
      try {
        await purchaseBag(bag.id);
      } catch (error) {
        failures.push(`${bag.id}: ${error.message}`);
      }
    }

    setLoading(false);

    if (failures.length) {
      setScanError(`Purchase completed with errors: ${failures.join('; ')}`);
    } else {
      alert(`Purchase successful for ${scannedBags.length} bag(s).`);
      setScannedBags([]);
      setOtpSent(false);
      setOtpInput('');
      setOtpCountdown(0);
      setScanStatus('Purchase complete');
    }
  };

  return (
    <div className="bag-scanner-page">
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <button className="scanner-btn" onClick={startScanner} disabled={scanning}>
          Start QR Scan
        </button>
        <button className="scanner-btn" onClick={() => fileInputRef.current?.click()}>
          Upload QR Image
        </button>
        {scanning && (
          <button className="scanner-btn" style={{ background: '#ef4444' }} onClick={stopScanner}>
            Stop QR Scan
          </button>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <div id="qr-reader" className="qr-reader" />

      {scanStatus && <p style={{ marginTop: '16px' }}>{scanStatus}</p>}
      {scanError && <p className="error" style={{ marginTop: '8px' }}>{scanError}</p>}
      {loading && <p>Loading...</p>}

      {farmerData && (
        <div style={{ marginTop: '24px', padding: '20px', border: '1px solid #d1d5db', borderRadius: '16px', background: '#ffffff' }}>
          <h3 style={{ margin: 0, marginBottom: '12px' }}>Farmer</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
            <div><strong>Name:</strong> {farmerData.name || '—'}</div>
            <div><strong>Aadhar:</strong> {farmerData.aadhar_id || farmerData.aadhar || '—'}</div>
            <div><strong>Village:</strong> {farmerData.village || '—'}</div>
            <div><strong>District:</strong> {farmerData.district || '—'}</div>
            <div><strong>Phone:</strong> {farmerData.phone || '—'}</div>
          </div>
        </div>
      )}

      {scannedBags.length > 0 ? (
        <div style={{ marginTop: '24px', padding: '20px', border: '1px solid #d1d5db', borderRadius: '16px', background: '#ffffff' }}>
          <h3 style={{ margin: 0, marginBottom: '16px' }}>Bill Summary</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Bag ID</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Product</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Weight</th>
                  <th style={{ textAlign: 'right', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Price</th>
                  <th style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', padding: '8px' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {scannedBags.map((bag) => (
                  <tr key={bag.id}>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{bag.id}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{bag.product_name || '—'}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9' }}>{bag.bag_weight || '—'}</td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                      {getBagPrice(bag) ? formatCurrency(getBagPrice(bag)) : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 8px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeScannedBag(bag.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>Total items: {scannedBags.length}</p>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>Total amount before OTP.</p>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(totalAmount)}</div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!otpSent ? (
              <button className="purchase-button" onClick={handleSendOtp} disabled={sendingOtp || !scannedBags.length}>
                {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
              <div style={{ width: '100%' }}>
                <div className="otp-verification-panel">
                  <h3>OTP Verification</h3>
                  <p className="otp-hint">An OTP has been sent to farmer's mobile number: <strong>{farmerData.phone || 'registered number'}</strong></p>
                  <div className="otp-input-group">
                    <input
                      type="text"
                      placeholder="Enter 6-Digit OTP"
                      value={otpInput}
                      onChange={(e) => {
                        setOtpInput(e.target.value.replace(/[^0-9]/g, ''));
                        setOtpError(null);
                      }}
                      maxLength="6"
                      disabled={verifyingOtp}
                      className="otp-input-field"
                    />
                    <button className="verify-otp-button" onClick={handleVerifyAndPurchase} disabled={verifyingOtp || otpInput.length < 6}>
                      {verifyingOtp ? 'Verifying...' : 'Verify & Purchase'}
                    </button>
                  </div>
                  {otpError && <p className="error-message">{otpError}</p>}
                  <div className="otp-footer">
                    {otpCountdown > 0 ? (
                      <p className="resend-countdown">Resend OTP in {otpCountdown}s</p>
                    ) : (
                      <button type="button" className="resend-button" onClick={handleSendOtp} disabled={sendingOtp}>
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '24px', padding: '20px', border: '1px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', background: '#f8fafc' }}>
          <p style={{ margin: 0, color: '#475569' }}>Scan QR codes to add bags to the bill.</p>
        </div>
      )}

      <style>{`
        .otp-verification-panel {
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 24px;
          margin-top: 24px;
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.08);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .otp-verification-panel h3 {
          margin-top: 0;
          color: #16a34a;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .otp-hint {
          color: #475569;
          margin: 8px 0 20px 0;
          font-size: 0.95rem;
        }
        .otp-input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .otp-input-field {
          flex: 1;
          min-width: 180px;
          background: #f8fafc;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          padding: 12px 16px;
          color: #0f172a;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .otp-input-field:focus {
          border-color: #22c55e;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.12);
        }
        .verify-otp-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .verify-otp-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
        .verify-otp-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #dc2626;
          font-size: 0.95rem;
          margin: 8px 0 0;
          font-weight: 500;
        }
        .otp-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .resend-countdown {
          color: #64748b;
          font-size: 0.9rem;
        }
        .resend-button {
          background: transparent;
          color: #2563eb;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 600;
          padding: 4px 8px;
          transition: color 0.2s ease;
        }
        .resend-button:hover {
          color: #3b82f6;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
