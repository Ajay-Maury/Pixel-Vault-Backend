# Pixel Vault Backend

A Node.js + Express + PostgreSQL + Cloudinary backend for the Pixel Vault image management application.

## Features

- ✅ User authentication with JWT
- ✅ Image upload to Cloudinary
- ✅ Image metadata storage in PostgreSQL
- ✅ Image search with filtering
- ✅ Public/private image access control
- ✅ Docker & Docker Compose ready
- ✅ Render deployment ready

## Tech Stack

- **Runtime**: Node.js 20-alpine
- **Framework**: Express.js
- **Database**: PostgreSQL 17
- **Storage**: Cloudinary
- **Auth**: JWT (7-day expiry) with bcryptjs (10 rounds)
- **File Upload**: Multer
- **Containerization**: Docker & Docker Compose
- **Deployment**: Render (primary)

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
render.yaml          (Render deployment config)
```

## Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose (for local PostgreSQL)
- npm
- Cloudinary account (free at https://cloudinary.com)

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

Edit `.env` with your database password and Cloudinary credentials:
- `POSTGRES_PASSWORD`: Any password for local PostgreSQL
- `CLOUDINARY_CLOUD_NAME`: From Cloudinary dashboard
- `CLOUDINARY_API_KEY`: From Cloudinary dashboard
- `CLOUDINARY_API_SECRET`: From Cloudinary account settings

### 3. Run with Docker Compose
```bash
docker-compose up
```

This starts:
- PostgreSQL on `localhost:5432`
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

### 2. Cloudinary Setup
```bash
# Sign up at https://cloudinary.com (free account)
# Get your credentials from: https://cloudinary.com/console/settings/account
# You'll need:
# - Cloud Name
# - API Key
# - API Secret
```

### 3. Environment Variables
Update `.env`:
```
PORT=5000
DATABASE_URL=postgresql://pixelvault:password@localhost:5432/pixelvault
JWT_SECRET=your-secret-key-32-chars-minimum
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
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
- `POST /api/image/minio-upload` - Upload file to Cloudinary
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

## Deployment on Render

### Step 1: Create Render Account
- Sign up at https://render.com

### Step 2: Create New Service
- Dashboard → New → Web Service
- Connect your GitHub repository
- Select `main` branch

### Step 3: Configure Service
- **Name**: pixel-vault-backend
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 4: Add PostgreSQL Database
- Dashboard → New → PostgreSQL
- Copy the `Database URL`

### Step 5: Set Environment Variables
In Render Dashboard → Environment:
```
PORT=5000
NODE_ENV=production
DATABASE_URL=[from PostgreSQL service]
JWT_SECRET=[generate strong secret]
CLOUDINARY_CLOUD_NAME=[from Cloudinary]
CLOUDINARY_API_KEY=[from Cloudinary]
CLOUDINARY_API_SECRET=[from Cloudinary]
```

### Step 6: Deploy
- Click "Create Web Service"
- Render automatically deploys on GitHub push

See [render.yaml](./render.yaml) for infrastructure as code configuration.

## Environment Variables

**All variables are strictly required. No defaults.**

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `production` or `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Generated with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | From https://cloudinary.com/console |
| `CLOUDINARY_API_KEY` | Cloudinary API key | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | From Cloudinary account settings |

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
image_url (TEXT) - Cloudinary URL
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
- Cloudinary credentials are kept secure (never expose API secret in frontend)
- Use HTTPS in production (Render enforces this)
- Change `JWT_SECRET` in production to a strong random value
- Keep `.env` file secure and in `.gitignore`

## Troubleshooting

### PostgreSQL connection error
```
Check DATABASE_URL format
psql postgresql://user:pass@host:5432/db
```

### Cloudinary upload error
```
Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
Check Cloudinary account settings for correct credentials
Ensure API key is active in Cloudinary dashboard
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
