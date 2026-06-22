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

If this email had pending group invites created before registration, those invites are automatically linked to the new account.

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

- `GET /api/user/search?email=aj&limit=10`
  Requires `Authorization: Bearer <token>`. Returns up to 20 matching users for invite/autocomplete flows and excludes the authenticated user. The `email` query must be at least 2 characters. This endpoint is rate-limited.

- `POST /api/share-groups`

```json
{
  "name": "friends"
}
```

Creates a share group owned by the authenticated user. Group names are limited to 10 characters and are unique per owner.

- `GET /api/share-groups/my-owned`
  Lists groups owned by the authenticated user.

- `GET /api/share-groups/my-joined`
  Lists groups where the authenticated user is an accepted member.

- `GET /api/share-groups/my-invites`
  Lists invites for the authenticated user. Use `?status=pending` to get only pending invites.

- `GET /api/share-groups/:id`
  Returns group details for the owner or an accepted member.

- `POST /api/share-groups/:id/invite`

```json
{
  "emails": ["user1@example.com", "user2@example.com"]
}
```

Invites users to a group owned by the authenticated user.

- `POST /api/share-groups/invites/:memberId/accept`
  Accepts an invite for the authenticated user.

- `POST /api/share-groups/invites/:memberId/reject`
  Rejects an invite for the authenticated user.

- `GET /api/share-groups/:id/images?searchText=sun&keyword=sunset&visibility=all&uploaderUserId=user-id&fromDate=2026-06-01&toDate=2026-06-30&sortBy=addedAt&sortOrder=desc&limit=20&offset=0`
  Lists images shared in the group. Available to the owner and accepted members. `searchText`, `keyword`, `uploaderUserId`, and date filters affect the returned data and the counts. `limit` and `offset` affect only the returned page.

Example response:

```json
{
  "group": {
    "id": "group-id",
    "name": "friends"
  },
  "searchText": "sun",
  "keyword": "sunset",
  "visibility": "all",
  "uploaderUserId": null,
  "fromDate": null,
  "toDate": null,
  "sortBy": "addedAt",
  "sortOrder": "desc",
  "data": [],
  "totalCount": 12,
  "privateCount": 7,
  "publicCount": 5,
  "limit": 20,
  "offset": 0
}
```

- `POST /api/share-groups/:id/images/add`

```json
{
  "imageIds": ["uuid-1", "uuid-2"]
}
```

Adds owned images to the selected group.

- `POST /api/share-groups/:id/images/remove`

```json
{
  "imageIds": ["uuid-1", "uuid-2"]
}
```

Removes images from the selected group.

- `POST /api/share-groups/:id/images/:imageId/download`
  Records the download in the backend for audit purposes and returns the image download URL. Available to the owner and accepted members. This endpoint is rate-limited.

- `GET /api/share-groups/:id/downloads/summary`
  Owner-only download analytics summary for the group.

- `GET /api/share-groups/:id/downloads?limit=20&offset=0`
  Owner-only paginated download audit history for the group.

- `PUT /api/share-groups/:id`

```json
{
  "name": "family"
}
```

Renames a group owned by the authenticated user.

- `DELETE /api/share-groups/:id`
  Deletes a group owned by the authenticated user.

- `DELETE /api/share-groups/:id/members/:memberId`
  Removes a member or invite from a group owned by the authenticated user.

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
  `multipart/form-data` with file field `image` or `images`. You can upload up to 40 files in one request, and each image must be at most `5 MB`.

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
When using `imageUrls`, you can save up to 40 images and each image must be at most `5 MB`.

- `POST /api/image/search`

```json
{
  "searchText": "sunset",
  "limit": 12,
  "offset": 0,
  "myLibrary": false
}
```

Response counts are not affected by pagination. `limit` and `offset` only affect the `data` array. `searchText` affects both `data` and the counts.

Example response:

```json
{
  "data": [],
  "totalCount": 25,
  "privateCount": 15,
  "publicCount": 10
}
```

`myLibrary: true` restricts results and counts to the authenticated user's uploads. Otherwise the route returns and counts public images only, so `privateCount` will be `0`.

- `POST /api/image/bulk/privacy`

```json
{
  "imageIds": ["uuid-1", "uuid-2"],
  "isPrivate": true
}
```

Updates privacy for up to 100 owned images in one request.

- `POST /api/image/bulk/delete`

```json
{
  "imageIds": ["uuid-1", "uuid-2"]
}
```

Deletes up to 100 owned images in one request. Cloudinary deletion is attempted before the database records are removed.

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
