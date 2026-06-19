import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const API_BASE_URL = "https://fertilizers-oz5a.onrender.com";

export default function NewBagScannerPage({ setCurrentPage, farmerData: initialFarmerData }) {
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [bagData, setBagData] = useState(null);
  const [farmerData, setFarmerData] = useState(initialFarmerData || null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOtp = async () => {
  setSendingOtp(true);
  setOtpError(null);

  try {
    const aadhar =
      farmerData?.aadhar_id ||
      farmerData?.aadhar;

    const response = await fetch(
      `${API_BASE_URL}/api/otp/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aadhar }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }

    setOtpSent(true);
    setOtpCountdown(30);

    alert('OTP sent successfully!');
  } catch (e) {
    setOtpError(e.message || 'Failed to send OTP');
  } finally {
    setSendingOtp(false);
  }
};

  const handleVerifyAndPurchase = async () => {
  setVerifyingOtp(true);
  setOtpError(null);

  try {
    const aadhar =
      farmerData?.aadhar_id ||
      farmerData?.aadhar;

    const response = await fetch(
      `${API_BASE_URL}/api/otp/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhar,
          otp: otpInput,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.verified) {
      throw new Error(data.error || 'Invalid OTP');
    }

    await handlePurchase();
  } catch (e) {
    setOtpError(
      e.message || 'OTP verification failed'
    );
  } finally {
    setVerifyingOtp(false);
  }
};

  const fetchBagById = async (bagId) => {
    const res = await fetch(`${API_BASE_URL}/api/bags/${bagId}`);
    if (!res.ok) throw new Error('Bag not found');
    return await res.json();
  };

  const fetchFarmerByAadhar = async (aadhar) => {
    const res = await fetch(`${API_BASE_URL}/api/farmers/${aadhar}`);
    if (!res.ok) throw new Error('Farmer not found');
    return await res.json();
  };

  const handleSuccess = async (decodedText) => {
    let payload;
    try {
      payload = JSON.parse(decodedText);
    } catch {
      setError('Invalid QR payload');
      return;
    }

    const bagId = payload.bagId || payload.bagIds;
    if (!bagId) {
      setError('QR missing bagId');
      return;
    }            

    setLoading(true);
    try {
      const bag = await fetchBagById(bagId);
      setBagData(bag);

      if (bag.aadhar) {
        const farmer = await fetchFarmerByAadhar(bag.aadhar);
        setFarmerData(farmer.farmer || farmer);
      }

      setError(null);

      const scanner = scannerRef.current;
      if (scanner) {
        await scanner.stop().catch(() => {});
        if (scanner.clear) scanner.clear();
        scannerRef.current = null; // ✅ clear ref so startScanner can run again
      }
      setScanning(false);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ THIS WAS MISSING — handleFileUpload was never defined
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset previous results
    setBagData(null);
    setFarmerData(initialFarmerData || null);
    setError(null);

    try {
      // Stop camera scanner if running
      if (scannerRef.current) {
        await scannerRef.current.stop().catch(() => {});
        if (scannerRef.current.clear) scannerRef.current.clear();
        scannerRef.current = null;
        setScanning(false);
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      const result = await html5QrCode.scanFile(file, true);
      await html5QrCode.clear();

      await handleSuccess(result);
    } catch (e) {
      setError(`Upload scan error: ${e}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
      fileInputRef.current.click();
    }
  };

  const startScanner = () => {
    if (scannerRef.current) return;
    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;
    html5QrCode
      .start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, handleSuccess)
      .then(() => setScanning(true))
      .catch((err) => setError(`Scanner error: ${err}`));
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    await scanner.stop().catch(() => {});
    if (scanner.clear) scanner.clear();
    scannerRef.current = null; // ✅ always clear the ref
    setScanning(false);
  };

  useEffect(() => {
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurchase = async () => {
    if (!bagData || !farmerData) return;
    const aadharToUse = initialFarmerData?.aadhar || farmerData.aadhar;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bags/${bagData.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_aadhar: aadharToUse })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Purchase failed');
      }
      alert('Purchase successful!');
      // Refetch updated bag data to reflect sold status
      const updatedBag = await fetchBagById(bagData.id);
      setBagData(updatedBag);
      // Optionally navigate or stay on page; here we stay to show sold status
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="bag-scanner-page">
      

      <button className="scanner-btn" onClick={startScanner} disabled={scanning}>
  Start QR Scan
</button>
<button className="scanner-btn" onClick={triggerFileInput} disabled={scanning}>
  Upload QR Image
</button>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      {scanning && (
  <button className="scanner-btn" style={{ background: '#ef4444' }} onClick={stopScanner}>
    Stop QR Scan
  </button>
)}

      <div id="qr-reader" className="qr-reader"></div>

      {loading && <p>Loading details...</p>}
      {error && <p className="error">{error}</p>}

      {(bagData || farmerData) && (
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginTop: '24px',
    width: '100%'
  }}>
    {bagData && (
      <div style={{
        background: '#ffffff',
        border: '1px solid #dfe7f2',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700',
          color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📦 Bag Details
        </h3>
        {[
          ['ID', bagData.id || bagData.bagIds],
          ['Product', bagData.product_name || bagData.product],
          ['Weight', `${bagData.bag_weight || bagData.weight} kg`],
          ['Batch', bagData.batch_number],
          ['Status', bagData.status],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #f1f5f9'
          }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    )}

    {farmerData && (
      <div style={{
        background: '#ffffff',
        border: '1px solid #dfe7f2',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '700',
          color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          👨‍🌾 Farmer Details
        </h3>
        {[
          ['Name', farmerData.name],
          ['Aadhar', farmerData.aadhar_id || farmerData.aadhar],
          ['Village', farmerData.village],
          ['District', farmerData.district],
          ['Limit', farmerData.limit ? `${farmerData.limit} kg` : null],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: '1px solid #f1f5f9'
          }}>
            <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <span style={{ color: '#0f172a', fontWeight: '600', fontSize: '14px' }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)}
      {bagData && farmerData && (
        <div style={{ marginTop: '24px', width: '100%' }}>
          {/* If bag already sold, show message */}
          {bagData.status === 'sold' ? (
            <p className="success-message">This bag has been sold.</p>
          ) : (
            !otpSent ? (
              <button className="purchase-button" onClick={handleSendOtp} disabled={sendingOtp}>
                {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
              </button>
            ) : (
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
            )
          )}
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
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .otp-verification-panel h3 {
          margin-top: 0;
          color: #4ade80;
          font-size: 1.25rem;
          font-weight: 600;
        }
        .otp-hint {
          color: #94a3b8;
          margin: 8px 0 20px 0;
          font-size: 0.95rem;
        }
        .otp-input-group {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .otp-input-field {
          flex: 1;
          background: rgba(0, 0, 0, 0.2);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          color: #fff;
          font-size: 1.1rem;
          text-align: center;
          letter-spacing: 4px;
          outline: none;
          transition: all 0.2s ease;
        }
        .otp-input-field:focus {
          border-color: #4ade80;
          background: rgba(0, 0, 0, 0.3);
          box-shadow: 0 0 10px rgba(74, 222, 128, 0.2);
        }
        .verify-otp-button {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .verify-otp-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        .verify-otp-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #ef4444;
          font-size: 0.9rem;
          margin: 8px 0;
          font-weight: 500;
        }
        .otp-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-top: 12px;
        }
        .resend-countdown {
          color: #64748b;
          font-size: 0.85rem;
        }
        .resend-button {
          background: transparent;
          color: #3b82f6;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 4px 8px;
          transition: all 0.2s ease;
        }
        .resend-button:hover {
          color: #60a5fa;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
