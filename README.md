# Pixel Vault Backend

A Node.js + Express + PostgreSQL + MinIO backend for the Pixel Vault image management application.

## Features

- User authentication with JWT
- Image upload to MinIO (S3-compatible)
- Image metadata storage in PostgreSQL
- Image search with filtering
- Public/private image access control
- Docker & Docker Compose ready
- Railway deployment optimized

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Storage**: MinIO (S3-compatible)
- **Auth**: JWT with bcryptjs
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose

## Project Structure

```
src/
├── routes/
│   ├── user.js       (Register, Login)
│   └── image.js      (Upload, Save, Search)
├── middleware/
│   └── auth.js       (JWT verification)
├── db/
│   ├── index.js      (PostgreSQL pool)
│   └── schema.sql    (Database schema)
└── index.js          (Express app entry)

Dockerfile           (Container image definition)
docker-compose.yml   (Local dev environment)
railway.toml         (Railway deployment config)
```

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose
- npm (or just use Docker)

### 1. Clone & Install
```bash
git clone <repo>
cd Pixel-Vault-Backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL and MinIO credentials if not using Docker Compose.

### 3. Run with Docker Compose
```bash
docker-compose up
```

This starts:
- PostgreSQL on `localhost:5432`
- MinIO on `localhost:9000` (dashboard at `:9001`)
- Node app on `localhost:5000`

### 4. Test the API
```bash
curl http://localhost:5000/health
```

## Manual Setup (Without Docker)

### 1. PostgreSQL Setup
```bash
# Install PostgreSQL 15
# Create database
createuser pixelvault
createdb -O pixelvault pixelvault

# Run schema
psql -U pixelvault -d pixelvault -f src/db/schema.sql
```

### 2. MinIO Setup
```bash
# Using Docker
docker run -p 9000:9000 -p 9001:9001 -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin minio/minio:latest server /data --console-address ":9001"

# Create bucket via S3 client or MinIO CLI
# Default credentials: minioadmin:minioadmin
```

### 3. Environment Variables
Update `.env`:
```
PORT=5000
DATABASE_URL=postgresql://pixelvault:password@localhost:5432/pixelvault
JWT_SECRET=your-secret-key
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=pixelvault
MINIO_USE_SSL=false
```

### 4. Start Development Server
```bash
npm install
npm run dev
```

## API Routes

### Authentication
- `POST /api/user/register` - Register new user
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```

- `POST /api/user/login` - Login user
  ```json
  {
    "email": "user@example.com",
    "password": "secure_password"
  }
  ```
  Returns: `{ token, user: { id, email } }`

### Image Management (Auth Required)
- `POST /api/image/minio-upload` - Upload file to MinIO
  - Form data: `image` (file)
  - Returns: `{ secure_url, width, height }`

- `POST /api/image/save` - Save image metadata
  ```json
  {
    "title": "My Image",
    "description": "Image description",
    "imageUrl": "https://minio.../image.jpg",
    "keywords": "tag1, tag2",
    "width": 1920,
    "height": 1080,
    "size": 2048000,
    "isPrivate": false
  }
  ```

### Search (Auth Optional)
- `POST /api/image/search` - Search images
  ```json
  {
    "searchText": "nature",
    "limit": 12,
    "offset": 0
  }
  ```
  - Public images always visible
  - Private images only visible to owner

### Health Check
- `GET /health` - Server status

## Deployment on Railway

### Step 1: Initialize Railway Project
```bash
npm install -g @railway/cli
railway init
```

### Step 2: Add PostgreSQL
```bash
railway add
# Select PostgreSQL
```

Railway automatically creates the `DATABASE_URL` environment variable.

### Step 3: Set Environment Variables
In Railway Dashboard → Variables tab:
```
JWT_SECRET=your-strong-secret
MINIO_ENDPOINT=your-s3-endpoint.com
MINIO_ACCESS_KEY=your-key
MINIO_SECRET_KEY=your-secret
MINIO_BUCKET=pixelvault
MINIO_USE_SSL=true
```

### Step 4: Deploy
```bash
railway up
```

Or push to GitHub and enable auto-deploy in Railway dashboard.

### Recommended S3 Providers for MinIO Compatibility
- **AWS S3** - Most compatible, recommended
- **Linode Object Storage** - S3-compatible, affordable
- **MinIO Cloud** - Managed MinIO hosting
- **DigitalOcean Spaces** - AWS S3-compatible

See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | `localhost:9000` |
| `MINIO_ACCESS_KEY` | S3 access key | `minioadmin` |
| `MINIO_SECRET_KEY` | S3 secret key | `minioadmin` |
| `MINIO_BUCKET` | S3 bucket name | `pixelvault` |
| `MINIO_USE_SSL` | Use HTTPS for S3 | `true` (production) |

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Run with Docker Compose
docker-compose up

# Run with Docker Compose (detached)
docker-compose up -d

# Stop Docker Compose
docker-compose down

# Reset Docker volumes (delete data)
docker-compose down -v
```

## Database Schema

### Users Table
```sql
id (UUID) - Primary key
email (TEXT) - Unique email
password_hash (TEXT) - Bcrypt hash
created_at (TIMESTAMP) - Creation timestamp
```

### Images Table
```sql
id (UUID) - Primary key
user_id (UUID) - Foreign key to users
title (TEXT) - Image title
description (TEXT) - Image description
image_url (TEXT) - MinIO/S3 URL
keywords (TEXT[]) - Array of keywords
width (INT) - Image width in pixels
height (INT) - Image height in pixels
size (INT) - File size in bytes
is_private (BOOLEAN) - Private/public flag
uploaded_at (TIMESTAMP) - Upload timestamp
```

## Error Handling

The API returns standard HTTP status codes with JSON responses:
```json
{
  "message": "Error description"
}
```

Common error codes:
- `400` - Bad Request (missing fields)
- `401` - Unauthorized (invalid token)
- `409` - Conflict (email already exists)
- `500` - Server Error

## Security Considerations

- Passwords are hashed with bcryptjs (10 rounds)
- JWT tokens expire after 7 days
- Private images are only accessible to their owner
- MinIO credentials should use strong, unique passwords
- Use HTTPS in production (`MINIO_USE_SSL=true`)
- Change `JWT_SECRET` in production
- Keep `.env` file secure and in `.gitignore`

## Troubleshooting

### PostgreSQL connection error
```
Check DATABASE_URL format
psql -c "SELECT 1" postgresql://user:pass@host:5432/db
```

### MinIO connection error
```
Verify endpoint, access key, and secret key
Check if MinIO/S3 service is running
Ensure bucket exists
```

### JWT token invalid
```
Verify JWT_SECRET matches between login and other requests
Check token format: "Bearer <token>"
Token may have expired (7 day expiry)
```

## License

MIT

## Support

For issues and questions, create an issue in the repository.
