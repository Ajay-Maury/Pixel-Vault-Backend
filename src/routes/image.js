const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const imageController = require('../controllers/imageController');
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
router.post('/save', auth, imageController.saveImage);

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
router.post('/search', imageController.searchImages);


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
router.delete('/:id', auth, imageController.deleteImage);


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
router.put('/:id', auth, imageController.updateImage);

module.exports = router;
