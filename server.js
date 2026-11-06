const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./config/db');
const recordsRoutes = require('./routes/recordsRoutes');
const backupRoutes = require('./routes/backupRoutes');
const trendingRoutes = require('./routes/trendingRoutes');
const videoRoutes = require('./routes/videoRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const masterRoutes = require('./routes/masterRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API Routes
app.use('/api', recordsRoutes);
app.use('/api', backupRoutes);
app.use('/api', trendingRoutes);
app.use('/api', videoRoutes);
app.use('/api', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master', masterRoutes);

// Root Health & System Info
app.get('/', (req, res) => {
  res.json({
    system: 'ISMS Enterprise Intelligence API',
    subdirectorate: 'Subdirektorat Pemantauan Strategis Kawasan Amerika dan Eropa',
    status: 'OPERATIONAL',
    endpoints: {
      health: '/api/health',
      records: '/api/records',
      backup: '/api/backup/status',
      trending: '/api/trending/issues',
      videos: '/api/trending/videos',
      auth: '/api/auth/login',
      users: '/api/users',
      master: '/api/master/config',
    },
    timestamp: new Date().toISOString(),
  });
});

// Start Server and Initialize Database
async function startServer() {
  console.log('======================================================================');
  console.log('🚀 ISMS ENTERPRISE BACKEND SERVICE');
  console.log('   Subdirektorat Pemantauan Strategis Kawasan Amerika dan Eropa');
  console.log('======================================================================');

  // Attempt database connection and schema setup
  await initDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Backend Server listening on http://0.0.0.0:${PORT} (All network interfaces)`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log('======================================================================\n');
  });
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
});

module.exports = app;
