require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
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
  CLOUDINARY_CLOUD_NAME: {
    required: true,
    description: 'Cloudinary cloud name',
    hint: 'Get from your Cloudinary dashboard at https://cloudinary.com/console/settings/account'
  },
  CLOUDINARY_API_KEY: {
    required: true,
    description: 'Cloudinary API key',
    hint: 'Get from your Cloudinary dashboard account settings'
  },
  CLOUDINARY_API_SECRET: {
    required: true,
    description: 'Cloudinary API secret',
    hint: 'Get from your Cloudinary dashboard account settings'
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

// Swagger UI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { 
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pixel Vault API Docs'
}));

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

// Health check helper function
const getHealthStatus = async () => {
  const health = {
    service: 'UP',
    database: 'DOWN',
    cloudinary: 'DOWN'
  };

  // Check database
  try {
    await db.testConnection();
    health.database = 'UP';
  } catch (err) {
    console.warn('[HEALTH] Database check failed:', err.message);
  }

  // Check Cloudinary
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    // Simple test: ping Cloudinary API
    await new Promise((resolve, reject) => {
      cloudinary.api.resources({ max_results: 1 }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    health.cloudinary = 'UP';
  } catch (err) {
    console.warn('[HEALTH] Cloudinary check failed:', err.message);
  }

  return health;
};

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Detailed health check
 *     description: Check the health status of the application, database, and Cloudinary integration
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Health status of all services
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                   description: Overall status
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                 service:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                   description: Application service status
 *                 database:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                   description: PostgreSQL database status
 *                 cloudinary:
 *                   type: string
 *                   enum: [UP, DOWN]
 *                   description: Cloudinary integration status
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/health', async (req, res) => {
  try {
    const health = await getHealthStatus();
    const overallStatus = health.service === 'UP' && health.database === 'UP' && health.cloudinary === 'UP' ? 'UP' : 'PARTIAL';
    
    res.status(health.database === 'UP' ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: health
    });
  } catch (err) {
    console.error('[HEALTH ERROR]', err.message);
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: { service: 'UP', database: 'DOWN', cloudinary: 'DOWN' }
    });
  }
});

app.use('/api/user', require('./routes/user'));
app.use('/api/image', require('./routes/image'));

const PORT = process.env.PORT;

// Start server after confirming database connection
const startServer = async () => {
  try {
    await db.testConnection();
    
    const server = app.listen(PORT, () => {
      console.log(`[SUCCESS] Server running on port ${PORT}`);
      console.log(`[INFO] API documentation available at http://localhost:${PORT}/api-docs`);
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
