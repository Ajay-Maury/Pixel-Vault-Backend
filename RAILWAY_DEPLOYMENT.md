# Railway Deployment Guide

## Prerequisites
- Railway CLI installed (`npm install -g @railway/cli`)
- Railway account created at https://railway.app

## Deployment Steps

### 1. Initialize Railway Project
```bash
railway init
```

### 2. Add Services
Railway will guide you through linking PostgreSQL. You can also add MinIO to Railway or use an external S3-compatible storage:

**Option A: Use Railway's PostgreSQL (Recommended)**
```bash
railway add
# Select PostgreSQL
```

Railway will automatically configure `DATABASE_URL` environment variable.

**Option B: External MinIO (e.g., Linode Object Storage, AWS S3)**
Set these environment variables in Railway dashboard:
- `MINIO_ENDPOINT`: Your S3 endpoint (e.g., `s3.example.com`)
- `MINIO_ACCESS_KEY`: Your access key
- `MINIO_SECRET_KEY`: Your secret key
- `MINIO_BUCKET`: Your bucket name (create if needed)
- `MINIO_USE_SSL`: `true` for production

### 3. Set Environment Variables
In Railway Dashboard:
1. Go to your service's Variables tab
2. Add the required variables:
   - `JWT_SECRET`: Generate a strong secret
   - `MINIO_ENDPOINT`: S3-compatible endpoint
   - `MINIO_ACCESS_KEY`: Access key
   - `MINIO_SECRET_KEY`: Secret key
   - `MINIO_BUCKET`: Bucket name
   - `MINIO_USE_SSL`: `true` for production

### 4. Deploy
```bash
railway up
```

Or push to your Git repository linked to Railway for automatic deployments.

### 5. Verify Deployment
```bash
railway open
```

Test the health endpoint:
```bash
curl https://your-railway-app.up.railway.app/health
```

## API Endpoints
- `POST /api/user/register`
- `POST /api/user/login`
- `POST /api/image/minio-upload` (auth required)
- `POST /api/image/save` (auth required)
- `POST /api/image/search` (auth optional)

## Database Setup
The PostgreSQL schema will be automatically applied when the container starts. If needed, manually run:
```bash
railway run psql -U pixelvault -d pixelvault -f src/db/schema.sql
```

## Monitoring
Monitor your deployment in the Railway Dashboard:
- Logs are available in real-time
- Deployment history is tracked
- You can rollback to previous deployments

## Troubleshooting
- Check logs: `railway logs`
- Check environment variables: `railway variables`
- Rebuild: `railway up --build`

## Local Testing Before Deployment
```bash
docker-compose up
```

Then test at `http://localhost:5000`
