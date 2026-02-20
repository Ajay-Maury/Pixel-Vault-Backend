require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error(`[STARTUP ERROR] Missing environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

console.log('[INFO] Starting Pixel Vault Backend...');
console.log(`[INFO] Node Environment: ${process.env.NODE_ENV || 'development'}`);

app.use(cors());
app.use(express.json());

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', {
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
app.use('/api/user', require('./routes/user'));
app.use('/api/image', require('./routes/image'));

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`[SUCCESS] Server running on port ${PORT}`);
  console.log(`[INFO] Health check available at http://localhost:${PORT}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[INFO] SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('[INFO] Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL ERROR] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
