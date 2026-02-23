const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const db = require('../db');
const auth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validate Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('[IMAGE] Cloudinary configuration incomplete - uploads may fail');
}

/**
 * @swagger
 * /api/image/minio-upload:
 *   post:
 *     summary: Upload image to Cloudinary
 *     description: Upload an image file to Cloudinary and get the URL
 *     tags:
 *       - Images
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (jpg, png, gif, etc.)
 *             required:
 *               - image
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secure_url:
 *                   type: string
 *                   format: uri
 *                   description: Cloudinary URL of the uploaded image
 *                 width:
 *                   type: integer
 *                   description: Image width in pixels
 *                 height:
 *                   type: integer
 *                   description: Image height in pixels
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - JWT token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/image/minio-upload  (auth required)
router.post('/minio-upload', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Upload to Cloudinary using buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `pixelvault/${req.user.id}`,
        resource_type: 'auto',
      },
      async (error, result) => {
        if (error) {
          console.error('[IMAGE UPLOAD ERROR]', {
            message: error.message,
            userId: req.user?.id,
            fileName: req.file?.originalname
          });
          return res.status(500).json({ message: error.message });
        }

        console.log('[IMAGE] File uploaded:', { fileName: req.file.originalname, userId: req.user.id, size: req.file.size });
        res.json({ 
          secure_url: result.secure_url, 
          width: result.width, 
          height: result.height 
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error('[IMAGE UPLOAD ERROR]', {
      message: err.message,
      userId: req.user?.id,
      fileName: req.file?.originalname
    });
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/image/save:
 *   post:
 *     summary: Save image metadata to database
 *     description: Save image details and metadata after uploading
 *     tags:
 *       - Images
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Image title
 *               description:
 *                 type: string
 *                 description: Image description
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Cloudinary URL (from minio-upload)
 *               keywords:
 *                 type: string
 *                 description: Comma-separated keywords for search
 *               width:
 *                 type: integer
 *                 description: Image width in pixels
 *               height:
 *                 type: integer
 *                 description: Image height in pixels
 *               size:
 *                 type: integer
 *                 description: File size in bytes
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether image is private (only visible to owner)
 *             required:
 *               - title
 *               - imageUrl
 *     responses:
 *       201:
 *         description: Image metadata saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image:
 *                   $ref: '#/components/schemas/Image'
 *       401:
 *         description: Unauthorized - JWT token required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/image/save  (auth required)
router.post('/save', auth, async (req, res) => {
  const { title, description, keywords, height, width, imageUrl, size, isPrivate } = req.body;
  try {
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const result = await db.query(
      `INSERT INTO images (user_id, title, description, image_url, keywords, height, width, size, is_private)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.user.id, title, description, imageUrl, keywordArray, height, width, size, isPrivate ?? true]
    );
    console.log('[IMAGE] Image saved:', { id: result.rows[0].id, userId: req.user.id, title });
    res.status(201).json({ image: result.rows[0] });
  } catch (err) {
    console.error('[IMAGE SAVE ERROR]', {
      message: err.message,
      userId: req.user?.id,
      title
    });
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/image/search:
 *   post:
 *     summary: Search for images
 *     description: Search images by title, description, or keywords. Public images are always visible. Private images only visible to owner.
 *     tags:
 *       - Images
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               searchText:
 *                 type: string
 *                 description: Search keywords (searches title, description, keywords)
 *               limit:
 *                 type: integer
 *                 default: 12
 *                 description: Number of results to return
 *               offset:
 *                 type: integer
 *                 default: 0
 *                 description: Number of results to skip (for pagination)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Image'
 *                 totalCount:
 *                   type: integer
 *                   description: Total number of matching images
 *       400:
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/image/search  (auth optional — public images always visible, private only to owner)
router.post('/search', async (req, res) => {
  const { searchText = '', limit = 12, offset = 0 } = req.body;
  const authHeader = req.headers.authorization;
  let userId = null;
  try {
    if (authHeader?.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
      userId = decoded.id;
    }
  } catch (err) {
    console.warn('[IMAGE SEARCH] Token verification failed:', err.message);
  }

  try {
    const search = `%${searchText}%`;
    const result = await db.query(
      `SELECT *, id::text AS _id FROM images
       WHERE (is_private = false OR user_id = $1)
       AND (title ILIKE $2 OR description ILIKE $2 OR $2 = '%%')
       ORDER BY uploaded_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, search, limit, offset]
    );
    const countResult = await db.query(
      `SELECT COUNT(*) FROM images
       WHERE (is_private = false OR user_id = $1)
       AND (title ILIKE $2 OR description ILIKE $2 OR $2 = '%%')`,
      [userId, search]
    );
    console.log('[IMAGE] Search performed:', { query: searchText, results: result.rows.length, userId });
    res.json({ data: result.rows, totalCount: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('[IMAGE SEARCH ERROR]', {
      message: err.message,
      query: searchText
    });
    res.status(500).json({ message: err.message });
  }
});


/**
 * Helper: extract Cloudinary public_id from a secure URL
 */
function extractPublicIdFromUrl(url) {
  try {
    // remove querystring
    const clean = url.split('?')[0];
    const parts = clean.split('/upload/');
    if (parts.length < 2) return null;
    let remainder = parts[1];
    // strip version prefix if present v123456789/
    remainder = remainder.replace(/^v\d+\//, '');
    // remove file extension
    remainder = remainder.replace(/\.[^/.]+$/, '');
    return remainder;
  } catch (err) {
    return null;
  }
}


/**
 * @swagger
 * /api/image/{id}:
 *   delete:
 *     summary: Delete an image
 *     description: Delete an image (Cloudinary resource + DB record). Only owner may delete.
 *     tags:
 *       - Images
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the image to delete
 *     responses:
 *       204:
 *         description: Image deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Image not found
 *       500:
 *         description: Server error
 */
// DELETE /api/image/:id (auth required)
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM images WHERE id = $1', [id]);
    const image = result.rows[0];
    if (!image) return res.status(404).json({ message: 'Image not found' });
    if (String(image.user_id) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    // attempt to remove from Cloudinary if possible
    try {
      const publicId = extractPublicIdFromUrl(image.image_url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        console.log('[IMAGE] Cloudinary resource destroyed', { publicId, userId: req.user.id });
      } else {
        console.warn('[IMAGE] Could not extract publicId for Cloudinary delete', { url: image.image_url });
      }
    } catch (err) {
      console.error('[IMAGE] Cloudinary delete error', { message: err.message, imageId: id });
      // continue to delete DB record even if Cloudinary delete fails
    }

    await db.query('DELETE FROM images WHERE id = $1', [id]);
    console.log('[IMAGE] Image DB record deleted', { id, userId: req.user.id });
    res.status(204).send();
  } catch (err) {
    console.error('[IMAGE DELETE ERROR]', { message: err.message, id });
    res.status(500).json({ message: err.message });
  }
});


/**
 * @swagger
 * /api/image/{id}:
 *   put:
 *     summary: Update image metadata
 *     description: Update title, description, keywords, and privacy for an image. Only owner may update.
 *     tags:
 *       - Images
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the image to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               keywords:
 *                 type: string
 *                 description: Comma-separated keywords
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 image:
 *                   $ref: '#/components/schemas/Image'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not owner
 *       404:
 *         description: Image not found
 *       500:
 *         description: Server error
 */
// PUT /api/image/:id (auth required)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { title, description, keywords, isPrivate } = req.body;
  try {
    const result = await db.query('SELECT * FROM images WHERE id = $1', [id]);
    const image = result.rows[0];
    if (!image) return res.status(404).json({ message: 'Image not found' });
    if (String(image.user_id) !== String(req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(Boolean) : image.keywords;
    const update = await db.query(
      `UPDATE images SET title = $1, description = $2, keywords = $3, is_private = $4 WHERE id = $5 RETURNING *`,
      [title ?? image.title, description ?? image.description, keywordArray, isPrivate ?? image.is_private, id]
    );
    console.log('[IMAGE] Image metadata updated', { id, userId: req.user.id });
    res.json({ image: update.rows[0] });
  } catch (err) {
    console.error('[IMAGE UPDATE ERROR]', { message: err.message, id, userId: req.user?.id });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
