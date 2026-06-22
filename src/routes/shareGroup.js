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
 * /api/share-groups/my-invites:
 *   get:
 *     summary: List invites for the authenticated user
 *     description: Returns the authenticated user's group invites. Pass `status=pending` to return only pending invites.
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending]
 *     responses:
 *       200:
 *         description: Invite list
 *       401:
 *         description: Unauthorized
 */
router.get('/my-invites', auth, asyncHandler(shareGroupController.listMyInvites));

/**
 * @swagger
 * /api/share-groups/invites/{memberId}/accept:
 *   post:
 *     summary: Accept a share group invite
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite accepted
 *       400:
 *         description: Invite is not pending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invite not found
 */
router.post('/invites/:memberId/accept', auth, asyncHandler(shareGroupController.acceptInvite));

/**
 * @swagger
 * /api/share-groups/invites/{memberId}/reject:
 *   post:
 *     summary: Reject a share group invite
 *     tags:
 *       - Share Groups
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invite rejected
 *       400:
 *         description: Invite is not pending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invite not found
 */
router.post('/invites/:memberId/reject', auth, asyncHandler(shareGroupController.rejectInvite));

/**
 * @swagger
 * /api/share-groups/{id}/images:
 *   get:
 *     summary: List images shared in a group
 *     description: Owners and accepted members can view the images currently shared in a group.
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
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: Shared images
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Group not found
 */
router.get('/:id/images', auth, asyncHandler(shareGroupController.listGroupImages));

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
 * /api/share-groups/{id}/invite:
 *   post:
 *     summary: Invite users to a share group
 *     description: Only the owner can invite users to the group by email.
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
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *             required:
 *               - emails
 *     responses:
 *       201:
 *         description: Users invited successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Invite already exists
 */
router.post('/:id/invite', auth, asyncHandler(shareGroupController.inviteMembers));

/**
 * @swagger
 * /api/share-groups/{id}/images/add:
 *   post:
 *     summary: Add images to a group
 *     description: Only the owner can add their own images to a share group.
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
 *               imageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - imageIds
 *     responses:
 *       200:
 *         description: Images added successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/:id/images/add', auth, asyncHandler(shareGroupController.addImagesToGroup));

/**
 * @swagger
 * /api/share-groups/{id}/images/remove:
 *   post:
 *     summary: Remove images from a group
 *     description: Only the owner can remove images from a share group.
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
 *               imageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *             required:
 *               - imageIds
 *     responses:
 *       200:
 *         description: Images removed successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: No matching group images found
 */
router.post('/:id/images/remove', auth, asyncHandler(shareGroupController.removeImagesFromGroup));

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
 * /api/share-groups/{id}/members/{memberId}:
 *   delete:
 *     summary: Remove a group member or invite
 *     description: Only the owner can remove a member or pending/rejected invite from the group.
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
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Member invite not found
 */
router.delete('/:id/members/:memberId', auth, asyncHandler(shareGroupController.removeMember));

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
