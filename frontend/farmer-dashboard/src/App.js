import { useMemo, useState } from 'react';
import './App.css';

const farmerRecords = [
  {
    id: 'FR-1024',
    crop: 'Wheat',
    land: '4.5 acres',
    fertilizer: 'Urea',
    limit: 500,
    purchased: 280,
    dealer: 'Green Agro Center',
    date: '2026-05-12',
    status: 'Eligible',
  },
  {
    id: 'FR-1025',
    crop: 'Soybean',
    land: '3.0 acres',
    fertilizer: 'DAP',
    limit: 320,
    purchased: 320,
    dealer: 'Kisan Seva Store',
    date: '2026-04-28',
    status: 'Limit Reached',
  },
  {
    id: 'FR-1026',
    crop: 'Rice',
    land: '2.8 acres',
    fertilizer: 'NPK',
    limit: 260,
    purchased: 110,
    dealer: 'Madhya Fertilizer Depot',
    date: '2026-03-19',
    status: 'Eligible',
  },
];

function FarmerRecords() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const filteredRecords = useMemo(() => {
    return farmerRecords.filter((record) => {
      const matchesSearch = `${record.id} ${record.crop} ${record.fertilizer} ${record.dealer}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = status === 'All' || record.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [query, status]);

  const totalPurchased = farmerRecords.reduce((sum, record) => sum + record.purchased, 0);
  const totalAvailable = farmerRecords.reduce(
    (sum, record) => sum + Math.max(record.limit - record.purchased, 0),
    0
  );

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Farmer Records</p>
          <h2>My Fertilizer Records</h2>
          <p>Review crop-wise fertilizer limits, purchases, dealer details, and eligibility.</p>
        </div>
      </header>

      <section className="summary-grid" aria-label="Farmer record summary">
        <div className="summary-card">
          <span>Total records</span>
          <strong>{farmerRecords.length}</strong>
        </div>
        <div className="summary-card">
          <span>Purchased</span>
          <strong>{totalPurchased} kg</strong>
        </div>
        <div className="summary-card">
          <span>Available</span>
          <strong>{totalAvailable} kg</strong>
        </div>
      </section>

      <section className="records-panel">
        <div className="records-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
            aria-label="Search farmer records"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            <option>All</option>
            <option>Eligible</option>
            <option>Limit Reached</option>
          </select>
        </div>

        <div className="records-table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Record ID</th>
                <th>Crop</th>
                <th>Land</th>
                <th>Fertilizer</th>
                <th>Purchased</th>
                <th>Available</th>
                <th>Dealer</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.id}</td>
                  <td>{record.crop}</td>
                  <td>{record.land}</td>
                  <td>{record.fertilizer}</td>
                  <td>{record.purchased} kg</td>
                  <td>{Math.max(record.limit - record.purchased, 0)} kg</td>
                  <td>{record.dealer}</td>
                  <td>{record.date}</td>
                  <td>
                    <span className={`status-pill ${record.status === 'Eligible' ? 'is-green' : 'is-orange'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function DashboardHome() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Farmer Dashboard</p>
          <h2>Welcome, Farmer</h2>
          <p>Track fertilizer entitlement, purchase history, and active record status.</p>
        </div>
      </header>

      <section className="home-grid">
        <button className="home-card" type="button">
          <span>Available balance</span>
          <strong>410 kg</strong>
        </button>
        <button className="home-card" type="button">
          <span>Last purchase</span>
          <strong>May 12</strong>
        </button>
        <button className="home-card" type="button">
          <span>Active crops</span>
          <strong>3</strong>
        </button>
      </section>
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  return (
    <div className="farmer-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <h1>Farmer</h1>
            <p>Dashboard</p>
          </div>
        </div>

        <nav className="nav-menu" aria-label="Farmer dashboard navigation">
          <button
            type="button"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`nav-item ${activePage === 'records' ? 'active' : ''}`}
            onClick={() => setActivePage('records')}
          >
            Farmer Records
          </button>
        </nav>
      </aside>

      <main className="main-panel">
        {activePage === 'dashboard' ? <DashboardHome /> : <FarmerRecords />}
      </main>
    </div>
  );
}

export default App;
