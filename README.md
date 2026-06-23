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

Copy [.env.example](/Users/jonh/personal/Pixel-Vault-Backend/.env.example) to `.env` and set all required values.

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

The frontend application that integrates with this backend service can be found in the [frontend repository](https://github.com/Jonh-Doe/Pixel-Vault.git)

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

Request:

```json
{
  "firstName": "Jonh",
  "lastName": "Doe",
  "gender": "MALE",
  "email": "jonh@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "user": {
    "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "email": "jonh@example.com",
    "firstName": "Jonh",
    "lastName": "Doe",
    "gender": "MALE",
    "created_at": "2026-06-23T09:20:10.000Z"
  }
}
```

If this email had pending group invites created before registration, those invites are automatically linked to the new account.

- `POST /api/user/login`

Request:

```json
{
  "email": "jonh@example.com",
  "password": "strong-password"
}
```

Response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "email": "jonh@example.com"
  }
}
```

- `GET /api/user/profile`
  Requires `Authorization: Bearer <token>`.

Response:

```json
{
  "user": {
    "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "email": "jonh@example.com",
    "firstName": "Jonh",
    "lastName": "Doe",
    "gender": "MALE",
    "createdAt": "2026-06-23T09:20:10.000Z",
    "uploadCount": 12
  }
}
```

- `PUT /api/user/profile`

Request:

```json
{
  "firstName": "Jonh",
  "lastName": "Doe",
  "gender": "MALE"
}
```

Response:

```json
{
  "user": {
    "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "email": "jonh@example.com",
    "firstName": "Jonh",
    "lastName": "Doe",
    "gender": "MALE",
    "createdAt": "2026-06-23T09:20:10.000Z"
  }
}
```

- `PUT /api/user/change-password`

Request:

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

Response:

```json
{
  "message": "Password changed successfully"
}
```

- `GET /api/user/search?email=aj&limit=10`
  Requires `Authorization: Bearer <token>`. Returns up to 20 matching users for invite/autocomplete flows and excludes the authenticated user. The `email` query must be at least 2 characters. This endpoint is rate-limited.

Response:

```json
{
  "users": [
    {
      "id": "5d8471f6-1c44-45ef-9c4e-ec44d95cb635",
      "email": "jonh@example.com",
      "firstName": "Jonh",
      "lastName": "Doe"
    }
  ]
}
```

### Share Groups

All share-group routes require `Authorization: Bearer <token>`.

- `POST /api/share-groups`

Request:

```json
{
  "name": "friends"
}
```

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
    "name": "friends",
    "ownerUserId": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "isOwner": true,
    "createdAt": "2026-06-23T10:00:00.000Z",
    "updatedAt": "2026-06-23T10:00:00.000Z",
    "owner": {
      "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
      "email": "jonh@example.com",
      "firstName": "Jonh",
      "lastName": "Doe"
    },
    "imageCount": 0,
    "memberCount": 0,
    "inviteCounts": {
      "pending": 0,
      "accepted": 0,
      "rejected": 0,
      "removed": 0
    },
    "members": []
  }
}
```

Group names are limited to 10 characters, can contain only letters, numbers, underscores, and hyphens, and are unique per owner.

- `GET /api/share-groups/my-owned`
- `GET /api/share-groups/my-joined`
- `GET /api/share-groups/:id`

These routes return the same `group` structure shown above, wrapped as either `{ "groups": [...] }` or `{ "group": { ... } }`.

- `GET /api/share-groups/my-invites`
  Use `?status=pending` to return only pending invites.

Response:

```json
{
  "invites": [
    {
      "id": "member-id",
      "email": "friend@example.com",
      "status": "PENDING",
      "invitedAt": "2026-06-23T10:30:00.000Z",
      "respondedAt": null,
      "group": {
        "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
        "name": "friends",
        "ownerUserId": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
        "owner": {
          "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
          "email": "jonh@example.com",
          "firstName": "Jonh",
          "lastName": "Doe"
        }
      },
      "user": {
        "id": "user-1",
        "email": "friend@example.com",
        "firstName": "Friend",
        "lastName": "One"
      }
    }
  ]
}
```

- `POST /api/share-groups/:id/invite`

Request:

```json
{
  "emails": ["friend1@example.com", "friend2@example.com"]
}
```

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
    "name": "friends",
    "ownerUserId": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "isOwner": true,
    "createdAt": "2026-06-23T10:00:00.000Z",
    "updatedAt": "2026-06-23T10:45:00.000Z",
    "owner": {
      "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
      "email": "jonh@example.com",
      "firstName": "Jonh",
      "lastName": "Doe"
    },
    "imageCount": 0,
    "memberCount": 2,
    "inviteCounts": {
      "pending": 2,
      "accepted": 0,
      "rejected": 0,
      "removed": 0
    },
    "members": [
      {
        "id": "member-1",
        "email": "friend1@example.com",
        "status": "PENDING",
        "invitedAt": "2026-06-23T10:45:00.000Z",
        "respondedAt": null,
        "user": {
          "id": "user-1",
          "firstName": "Friend",
          "lastName": "One",
          "email": "friend1@example.com"
        }
      }
    ]
  }
}
```

- `POST /api/share-groups/invites/:memberId/accept`
- `POST /api/share-groups/invites/:memberId/reject`

Response:

```json
{
  "invite": {
    "id": "member-id",
    "email": "friend@example.com",
    "status": "ACCEPTED",
    "invitedAt": "2026-06-23T10:30:00.000Z",
    "respondedAt": "2026-06-23T10:35:00.000Z",
    "group": {
      "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
      "name": "friends",
      "ownerUserId": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
      "owner": {
        "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
        "email": "jonh@example.com",
        "firstName": "Jonh",
        "lastName": "Doe"
      }
    },
    "user": {
      "id": "user-1",
      "email": "friend@example.com",
      "firstName": "Friend",
      "lastName": "One"
    }
  }
}
```

- `GET /api/share-groups/:id/images?searchText=sun&keyword=sunset&visibility=all&uploaderUserId=user-id&fromDate=2026-06-01&toDate=2026-06-30&sortBy=addedAt&sortOrder=desc&limit=20&offset=0`
  Lists images shared in the group. Available to the owner and accepted members. `searchText`, `keyword`, `uploaderUserId`, and date filters affect the returned data and the counts. `limit` and `offset` affect only the returned page.

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
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
  "data": [
    {
      "id": "group-image-id",
      "addedAt": "2026-06-23T11:00:00.000Z",
      "addedBy": {
        "id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
        "email": "jonh@example.com",
        "firstName": "Jonh",
        "lastName": "Doe"
      },
      "image": {
        "id": "image-id",
        "user_id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
        "title": "Sunset",
        "description": "Beach sunset",
        "image_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "keywords": ["sunset", "beach", "orange"],
        "width": 1200,
        "height": 800,
        "size": 245000,
        "is_private": true,
        "uploaded_at": "2026-06-23T09:45:00.000Z"
      }
    }
  ],
  "totalCount": 12,
  "privateCount": 7,
  "publicCount": 5,
  "limit": 20,
  "offset": 0
}
```

- `POST /api/share-groups/:id/images/add`

Request:

```json
{
  "imageIds": ["image-id-1", "image-id-2"]
}
```

Response:
Returns the updated `group` object.

- `POST /api/share-groups/:id/images/remove`

Request:

```json
{
  "imageIds": ["image-id-1", "image-id-2"]
}
```

Response:
Returns the updated `group` object.

- `POST /api/share-groups/:id/images/:imageId/download`
  Records the download in the backend for audit purposes and returns the image download URL. Available to the owner and accepted members. This endpoint is rate-limited.

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
    "name": "friends",
    "owner_user_id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd"
  },
  "image": {
    "id": "image-id",
    "user_id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "title": "Sunset",
    "description": "Beach sunset",
    "image_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "keywords": ["sunset", "beach", "orange"],
    "width": 1200,
    "height": 800,
    "size": 245000,
    "is_private": true,
    "uploaded_at": "2026-06-23T09:45:00.000Z"
  },
  "downloadUrl": "https://res.cloudinary.com/demo/image/upload/sample.jpg"
}
```

- `GET /api/share-groups/:id/downloads/summary`

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
    "name": "friends"
  },
  "totalDownloads": 8,
  "uniqueDownloaderCount": 3,
  "uniqueDownloadedImageCount": 5
}
```

- `GET /api/share-groups/:id/downloads?limit=20&offset=0`

Response:

```json
{
  "group": {
    "id": "5f68d7b0-4d3d-4eb4-a43b-a4484e67cfcc",
    "name": "friends"
  },
  "data": [
    {
      "id": "download-id",
      "downloadedAt": "2026-06-23T12:00:00.000Z",
      "downloader": {
        "id": "downloader-id",
        "email": "friend@example.com",
        "firstName": "Friend",
        "lastName": "One"
      },
      "image": {
        "id": "image-id",
        "title": "Sunset",
        "image_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        "is_private": true
      }
    }
  ],
  "totalCount": 8,
  "limit": 20,
  "offset": 0
}
```

- `PUT /api/share-groups/:id`

Request:

```json
{
  "name": "family"
}
```

Response:
Returns the updated `group` object.

- `DELETE /api/share-groups/:id`
  Deletes a group owned by the authenticated user.

- `DELETE /api/share-groups/:id/members/:memberId`
  Removes a member or invite from a group owned by the authenticated user and returns the updated `group` object.

### Images

All image routes require `Authorization: Bearer <token>`.

- `POST /api/image/minio-upload`
  `multipart/form-data` with file field `image` or `images`. You can upload up to 40 files in one request, and each image must be at most `5 MB`.

Response:

```json
{
  "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/pixelvault/user-1/sunset.jpg",
  "width": 1200,
  "height": 800,
  "size": 245000,
  "originalName": "sunset.jpg",
  "uploads": [
    {
      "secure_url": "https://res.cloudinary.com/demo/image/upload/v1/pixelvault/user-1/sunset.jpg",
      "width": 1200,
      "height": 800,
      "size": 245000,
      "originalName": "sunset.jpg"
    }
  ]
}
```

For multi-file uploads, the response is `{ "uploads": [...] }`.

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
  "data": [
    {
      "id": "image-id",
      "user_id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
      "title": "Sunset",
      "description": "Beach sunset",
      "image_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "keywords": ["sunset", "beach", "orange"],
      "width": 1200,
      "height": 800,
      "size": 245000,
      "is_private": false,
      "uploaded_at": "2026-06-23T09:45:00.000Z"
    }
  ],
  "totalCount": 25,
  "privateCount": 0,
  "publicCount": 25
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

Response:

```json
{
  "message": "Image privacy updated successfully",
  "updatedCount": 2,
  "isPrivate": true
}
```

- `POST /api/image/bulk/delete`

```json
{
  "imageIds": ["uuid-1", "uuid-2"]
}
```

Deletes up to 100 owned images in one request. Cloudinary deletion is attempted before the database records are removed.

Response:

```json
{
  "message": "Images deleted successfully",
  "deletedCount": 2
}
```

- `PUT /api/image/:id`

```json
{
  "title": "Updated title",
  "description": "Updated description",
  "keywords": "tag1, tag2",
  "isPrivate": false
}
```

Response:

```json
{
  "image": {
    "id": "image-id",
    "user_id": "7e55f5fa-0b33-48e6-8d61-66c7f17ad9cd",
    "title": "Updated title",
    "description": "Updated description",
    "image_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "keywords": ["tag1", "tag2"],
    "width": 1200,
    "height": 800,
    "size": 245000,
    "is_private": false,
    "uploaded_at": "2026-06-23T09:45:00.000Z"
  }
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
