import express from 'express';
import userController from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import rateLimit from '../middleware/rateLimit.js';

const router = express.Router();

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name (optional)
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *                 description: User's gender (MALE, FEMALE, OTHER)
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (should be strong)
 *             required:
 *               - firstName
 *               - gender
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     gender:
 *                       type: string
 *                       enum: [MALE, FEMALE, OTHER]
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required parameters or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/user/register
router.post('/register', asyncHandler(userController.register));

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user and get JWT token
 *     description: Authenticate user with email and password, returns JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful, JWT token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token (expires in 7 days)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/user/login
router.post('/login', asyncHandler(userController.login));

/**
 * @swagger
 * /api/user/search:
 *   get:
 *     summary: Search users by email
 *     description: Search users for invite/autocomplete flows. Requires at least 2 characters and excludes the authenticated user.
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *         description: Partial email text, minimum 2 characters
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Maximum number of users to return
 *     responses:
 *       200:
 *         description: Matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       email:
 *                         type: string
 *                         format: email
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                         nullable: true
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/search', auth, rateLimit({
  storeKey: 'user-search',
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyFn: (req) => req.user?.id ?? req.ip
}), asyncHandler(userController.searchUsers));

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get authenticated user profile
 *     description: Returns the authenticated user's profile details along with the total number of images uploaded by that user.
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                     gender:
 *                       type: string
 *                       enum: [MALE, FEMALE, OTHER]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     totalImages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/profile', auth, asyncHandler(userController.getProfile));

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update authenticated user profile
 *     description: Updates first name, last name, and gender for the authenticated user.
 *     tags:
 *       - Profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *                 nullable: true
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER]
 *             required:
 *               - firstName
 *               - gender
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                       nullable: true
 *                     gender:
 *                       type: string
 *                       enum: [MALE, FEMALE, OTHER]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required fields or invalid gender
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/profile', auth, asyncHandler(userController.updateProfile));

/**
 * @swagger
 * /api/user/change-password:
 *   put:
 *     summary: Change user password
 *     description: Change the authenticated user's password by providing the old and new password
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *             required:
 *               - oldPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing parameters or invalid password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
// PUT /api/user/change-password (auth required)
router.put('/change-password', auth, asyncHandler(userController.changePassword));

export default router;
