# Pixel Vault Backend

Express and Prisma backend for Pixel Vault. It handles user authentication, profile management, image metadata, Cloudinary uploads, Swagger docs, and PostgreSQL persistence.

## Stack

- Node.js 20
- Express 4
- Prisma 7 with PostgreSQL
- Cloudinary for file storage
- JWT authentication
- Swagger UI at `/api-docs`
- Docker and Render deployment support

## Features

- Email/password registration and login
- JWT-protected routes
- User profile fetch and update
- Password change endpoint
- Cloudinary upload flow for image files
- Image metadata save, update, delete, and search
- Health checks for app, database, and Cloudinary

## Project Structure

```text
src/
  controllers/   Request handlers
  middleware/    Auth middleware
  models/        Prisma-backed data access
  routes/        Express route definitions
  utils/         Errors, logging, async helpers
  index.js       App bootstrap
  prisma.js      Prisma client setup
  swagger.js     OpenAPI configuration

prisma/
  schema.prisma
  migrations/

Dockerfile
docker-compose.yml
render.yaml
```

## Environment Variables

Copy [.env.example](/Users/ajay/personal/Pixel-Vault-Backend/.env.example) to `.env` and set all required values.

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | API port. Default local setup uses `5000`. |
| `NODE_ENV` | Yes | `development` or `production`. |
| `POSTGRES_USER` | Docker only | Local Postgres username for Compose. |
| `POSTGRES_PASSWORD` | Docker only | Local Postgres password for Compose. |
| `POSTGRES_DB` | Docker only | Local Postgres database name for Compose. |
| `POSTGRES_PORT` | Docker only | Host port mapped to Postgres. |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | Yes | Secret used to sign JWTs. |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret. |

The app validates these at startup and exits with a clear error if any required value is missing.

## Local Development

### Option 1: Docker Compose

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Start the stack:

```bash
docker-compose up --build
```

This starts:

- PostgreSQL on `localhost:${POSTGRES_PORT}`
- API on `http://localhost:5000`

The app container runs `prisma migrate deploy` before starting the server.

### Option 2: Run app locally

1. Start a PostgreSQL instance and create a database.
2. Set `DATABASE_URL` in `.env`.
3. Install dependencies:

```bash
npm install
```

4. Apply migrations:

```bash
npx prisma migrate deploy
```

5. Start the API:

```bash
npm run dev
```

## Frontend

The frontend application that integrates with this backend service can be found in the [frontend repository](https://github.com/Ajay-Maury/Pixel-Vault.git)

## Useful Commands

```bash
npm run dev
npm start
npx prisma migrate deploy
docker-compose up --build
docker-compose down
```

## API Base URL

Local default base URL:

```text
http://localhost:5000
```

Interactive API docs:

```text
http://localhost:5000/api-docs
```

## Endpoints

### Health

- `GET /health`
  Lightweight container health check.
- `GET /api/health`
  Detailed health status for service, database, and Cloudinary.

### Auth and Profile

- `POST /api/user/register`

```json
{
  "firstName": "Ajay",
  "lastName": "Kumar",
  "gender": "MALE",
  "email": "ajay@example.com",
  "password": "strong-password"
}
```

- `POST /api/user/login`

```json
{
  "email": "ajay@example.com",
  "password": "strong-password"
}
```

Response includes a JWT token and basic user info.

- `GET /api/user/profile`
  Requires `Authorization: Bearer <token>`.

- `PUT /api/user/profile`

```json
{
  "firstName": "Ajay",
  "lastName": "Kumar",
  "gender": "MALE"
}
```

- `PUT /api/user/change-password`

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

### Images

All image routes require `Authorization: Bearer <token>`.

- `POST /api/image/minio-upload`
  `multipart/form-data` with file field `image` or `images`. You can upload up to 20 files in one request.

Response:

```json
{
  "uploads": [
    {
      "secure_url": "https://res.cloudinary.com/...",
      "width": 1200,
      "height": 800,
      "size": 245000,
      "originalName": "sunset.jpg"
    }
  ]
}
```

- `POST /api/image/save`

```json
{
  "title": "Sunset",
  "description": "Beach sunset",
  "keywords": "sunset, beach, orange",
  "imageUrl": "https://res.cloudinary.com/...",
  "isPrivate": true
}
```

Or for multiple images:

```json
{
  "title": "Sunset",
  "description": "Beach sunset",
  "keywords": "sunset, beach, orange",
  "imageUrls": [
    {
      "imageUrl": "https://res.cloudinary.com/...",
      "width": 1200,
      "height": 800,
      "size": 245000
    },
    {
      "imageUrl": "https://res.cloudinary.com/...",
      "width": 1000,
      "height": 700,
      "size": 185000
    }
  ],
  "isPrivate": true
}
```

Each uploaded image is stored as a separate database record. `title`, `description`, `keywords`, and `isPrivate` are applied to every saved image in the request. The save endpoint accepts either `imageUrl` for one image or `imageUrls` for one or many images.

- `POST /api/image/search`

```json
{
  "searchText": "sunset",
  "limit": 12,
  "offset": 0,
  "myLibrary": false
}
```

`myLibrary: true` restricts results to the authenticated user's uploads. Otherwise the route returns public images.

- `PUT /api/image/:id`

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "keywords": "tag1, tag2",
  "isPrivate": false
}
```

- `DELETE /api/image/:id`

Deletes the database record and attempts to remove the Cloudinary asset.

## Database

Prisma schema lives in [prisma/schema.prisma](./prisma/schema.prisma).

Current models:

- `users`
  - `id`, `email`, `password_hash`
  - `firstName`, `lastName`, `gender`
  - `created_at`
- `images`
  - `id`, `user_id`, `title`, `description`
  - `image_url`, `keywords`
  - `width`, `height`, `size`
  - `is_private`, `uploaded_at`

## Deployment

### Docker

[Dockerfile](./Dockerfile) builds a production image, generates the Prisma client, runs migrations, and starts the server on port `5000`.

### Render

[render.yaml](./render.yaml) defines:

- One web service using the Docker runtime
- One PostgreSQL database
- Required environment variables for production

## Notes

- Uploads are stored in Cloudinary under `pixelvault/<userId>`.
- Startup fails fast if required environment variables are missing.
- Request and error logging is enabled through the shared logger.


## Support

For issues and questions, create an issue in the repository.
