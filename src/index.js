import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import prisma from './prisma.js';
import userRoutes from './routes/user.js';
import imageRoutes from './routes/image.js';
import shareGroupRoutes from './routes/shareGroup.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
dotenv.config();


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
  console.error('STARTUP ERROR: Missing required environment variables');
  console.error('='.repeat(80));
  
  missingVars.forEach((variable, index) => {
    console.error(`\n${index + 1}. ${variable.name}`);
    console.error(`   Description: ${variable.description}`);
    console.error(`   Action Required: ${variable.hint}`);
  });
  
  console.error('\n' + '='.repeat(80));
  console.error('How to fix:');
  console.error('   1. Copy .env.example to .env: cp .env.example .env');
  console.error('   2. Edit .env and set all missing variables');
  console.error('   3. Save the file and restart the application');
  console.error('='.repeat(80) + '\n');
  
  process.exit(1);
}

logger.info('Starting Pixel Vault Backend');
logger.info('Runtime environment loaded', {
  nodeEnv: process.env.NODE_ENV || 'development'
});

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.info('Request completed', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id
    });
  });

  next();
});

// Swagger UI documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { 
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Pixel Vault API Docs'
}));

// Health check helper function
const getHealthStatus = async () => {
  const health = {
    service: 'UP',
    database: 'DOWN',
    cloudinary: 'DOWN'
  };

  // Check database
  try {
    await prisma.$connect();
    health.database = 'UP';
  } catch (err) {
    logger.warn('Health check: database unavailable', { error: err });
  }

  // Check Cloudinary
  try {
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
    logger.warn('Health check: cloudinary unavailable', { error: err });
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
    logger.error('Health endpoint failed', { error: err });
    res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: { service: 'UP', database: 'DOWN', cloudinary: 'DOWN' }
    });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/user', userRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/share-groups', shareGroupRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    userId: req.user?.id,
    error: err
  });

  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    message:
      statusCode >= 500 && process.env.NODE_ENV !== 'development'
        ? 'Internal Server Error'
        : err.message,
    ...(err.details ? { details: err.details } : {})
  });
});

const PORT = process.env.PORT;

// Start server after confirming database connection
const startServer = async () => {
  try {
    await prisma.$connect();
    const server = app.listen(PORT, () => {
      logger.info('Server running', { port: PORT });
      logger.info('API documentation available', {
        url: `http://localhost:${PORT}/api-docs`
      });
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
};

startServer();

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { promise: String(promise), reason });
  process.exit(1);
});
