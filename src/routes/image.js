const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');
const auth = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true,
});

// POST /api/image/minio-upload  (auth required)
router.post('/minio-upload', auth, upload.single('image'), async (req, res) => {
  try {
    const fileBuffer = req.file.buffer;
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const params = {
      Bucket: process.env.MINIO_BUCKET,
      Key: `images/${req.user.id}/${fileName}`,
      Body: fileBuffer,
      ContentType: req.file.mimetype,
    };
    await s3Client.send(new PutObjectCommand(params));
    const imageUrl = `http${process.env.MINIO_USE_SSL === 'true' ? 's' : ''}://${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/images/${req.user.id}/${fileName}`;
    res.json({ secure_url: imageUrl, width: null, height: null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
    res.status(201).json({ image: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
  } catch {}

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
    res.json({ data: result.rows, totalCount: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
