const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  override: true,
});

const express = require('express');
const cors = require('cors');
const batchRoutes = require('./routes/batchRoutes');
const farmerRecordRoutes = require('./routes/farmerRecordRoutes');
const qrRoutes = require('./routes/qrRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const scanRecordRoutes = require('./routes/scanRecordRoutes');
const bagRoutes = require('./routes/bagRoutes');
const farmerTransactionRoutes = require('./routes/farmerTransactionRoutes');
const aiAnalysisRoutes = require('./routes/aiAnalysisRoutes');
const otpRoutes = require('./routes/otpRoutes');


const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "https://v0-dealer-dashboard-deployment.vercel.app",
  "https://fertilizers-k584.vercel.app",
  "https://fertilizers-rho.vercel.app",
  "https://fertilizers-x7gz.vercel.app",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    if (allowedOrigins.includes(origin) || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json()); // ← must be before all routes

app.get('/', (req, res) => {
  res.send('Backend running');
});

app.use('/api/batches', batchRoutes);
app.use('/api/farmer-records', farmerRecordRoutes);
app.use('/api/qrcodes', qrRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/scan-records', scanRecordRoutes);
app.use('/api/bags', bagRoutes);
app.use('/api/farmer-transactions', farmerTransactionRoutes); // ← after express.json()
app.use('/api/ai', aiAnalysisRoutes);
app.use('/api/otp', otpRoutes);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
