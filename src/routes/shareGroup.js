import express from 'express';
import auth from '../middleware/auth.js';
import asyncHandler from '../utils/asyncHandler.js';
import shareGroupController from '../controllers/shareGroupController.js';

const router = express.Router();

/**
 * @swagger
 * /api/share-groups:
 *   post:
 *     summary: Create a share group
 *     description: Create a new share group owned by the authenticated user. Group names are limited to 10 characters and must be unique per owner.
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 10
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Invalid group name
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Group name already exists for this owner
 */
router.post('/', auth, asyncHandler(shareGroupController.createGroup));

/**
 * @swagger
 * /api/share-groups/my-owned:
 *   get:
 *     summary: List groups owned by the authenticated user
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Owned groups
 *       401:
 *         description: Unauthorized
 */
router.get('/my-owned', auth, asyncHandler(shareGroupController.listOwnedGroups));

/**
 * @swagger
 * /api/share-groups/my-joined:
 *   get:
 *     summary: List groups the authenticated user has joined
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Joined groups
 *       401:
 *         description: Unauthorized
 */
router.get('/my-joined', auth, asyncHandler(shareGroupController.listJoinedGroups));

/**
 * @swagger
 * /api/share-groups/{id}:
 *   get:
 *     summary: Get a share group
 *     description: Owners and accepted members can view group details.
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
router.get('/:id', auth, asyncHandler(shareGroupController.getGroup));

/**
 * @swagger
 * /api/share-groups/{id}:
 *   put:
 *     summary: Rename a share group
 *     description: Only the owner can rename a share group.
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 10
 *             required:
 *               - name
 *     responses:
 *       200:
 *         description: Group renamed successfully
 *       400:
 *         description: Invalid group name
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Group name already exists for this owner
 */
router.put('/:id', auth, asyncHandler(shareGroupController.updateGroup));

/**
 * @swagger
 * /api/share-groups/{id}:
 *   delete:
 *     summary: Delete a share group
 *     description: Only the owner can delete a share group.
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Group deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.delete('/:id', auth, asyncHandler(shareGroupController.deleteGroup));

export default router;
