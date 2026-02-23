require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();

// Validate required environment variables with detailed error messages
const ENV_VARS_SCHEMA = {
  PORT: {
    required: true,
    description: 'Server port (e.g., 5000)',
    hint: 'Add PORT=5000 to your .env file'
  },
  NODE_ENV: {
    required: true,
    description: 'Node environment (development, production, etc.)',
    hint: 'Add NODE_ENV=development or NODE_ENV=production to your .env file'
  },
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL connection string',
    hint: 'Add DATABASE_URL=postgresql://user:password@host:port/database to your .env file'
  },
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT token signing',
    hint: 'Generate a strong secret and add JWT_SECRET=your_secret_key to your .env file'
  },
  MINIO_ENDPOINT: {
    required: true,
    description: 'S3/MinIO endpoint (e.g., minio:9000 or s3.amazonaws.com)',
    hint: 'Add MINIO_ENDPOINT=your-endpoint to your .env file'
  },
  MINIO_ACCESS_KEY: {
    required: true,
    description: 'S3/MinIO access key',
    hint: 'Add MINIO_ACCESS_KEY=your_access_key to your .env file'
  },
  MINIO_SECRET_KEY: {
    required: true,
    description: 'S3/MinIO secret key',
    hint: 'Add MINIO_SECRET_KEY=your_secret_key to your .env file'
  },
  MINIO_BUCKET: {
    required: true,
    description: 'S3/MinIO bucket name',
    hint: 'Add MINIO_BUCKET=your_bucket_name to your .env file'
  },
  MINIO_USE_SSL: {
    required: true,
    description: 'Use SSL for S3/MinIO connection (true or false)',
    hint: 'Add MINIO_USE_SSL=true or MINIO_USE_SSL=false to your .env file'
  }
};

// Check all required environment variables
const missingVars = [];
for (const [varName, config] of Object.entries(ENV_VARS_SCHEMA)) {
  if (config.required && !process.env[varName]) {
    missingVars.push({
      name: varName,
      description: config.description,
      hint: config.hint
    });
  }
}

// Exit with detailed error if any variables are missing
if (missingVars.length > 0) {
  console.error('\n' + '='.repeat(80));
  console.error('❌ STARTUP ERROR: Missing required environment variables');
  console.error('='.repeat(80));
  
  missingVars.forEach((variable, index) => {
    console.error(`\n${index + 1}. ${variable.name}`);
    console.error(`   Description: ${variable.description}`);
    console.error(`   Action Required: ${variable.hint}`);
  });
  
  console.error('\n' + '='.repeat(80));
  console.error('📋 How to fix:');
  console.error('   1. Copy .env.example to .env: cp .env.example .env');
  console.error('   2. Edit .env and set all missing variables');
  console.error('   3. Save the file and restart the application');
  console.error('='.repeat(80) + '\n');
  
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

const PORT = process.env.PORT;

// Start server after confirming database connection
const startServer = async () => {
  try {
    await db.testConnection();
    
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
  } catch (err) {
    console.error('[STARTUP ERROR] Failed to start server:', err.message);
    process.exit(1);
  }
};

startServer();

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL ERROR] Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
