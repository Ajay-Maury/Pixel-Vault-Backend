import shareGroupModel from '../models/shareGroupModel.js';
import userModel from '../models/userModel.js';
import imageModel from '../models/imageModel.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import logger from '../utils/logger.js';

const MAX_GROUP_NAME_LENGTH = 10;
const GROUP_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
const MAX_GROUP_IMAGE_ACTION_COUNT = 100;

const shareGroupController = {
  async createGroup(req, res) {
    const normalizedName = normalizeGroupName(req.body.name);
    const nameKey = buildGroupNameKey(req.user.id, normalizedName);

    const existingGroup = await shareGroupModel.findOwnedGroupByNameKey(nameKey, req.user.id);
    if (existingGroup) {
      throw conflict('You already have a group with this name');
    }

    const group = await shareGroupModel.createGroup({
      name: normalizedName,
      name_key: nameKey,
      owner: {
        connect: {
          id: req.user.id
        }
      }
    });

    logger.info('Share group created', {
      userId: req.user.id,
      groupId: group.id,
      groupName: normalizedName
    });

    res.status(201).json({
      group: formatGroupResponse(group, req.user.id)
    });
  },

  async listOwnedGroups(req, res) {
    const groups = await shareGroupModel.findOwnedGroups(req.user.id);

    res.json({
      groups: groups.map((group) => formatGroupResponse(group, req.user.id))
    });
  },

  async listJoinedGroups(req, res) {
    const groups = await shareGroupModel.findJoinedGroups(req.user.id);

    res.json({
      groups: groups.map((group) => formatGroupResponse(group, req.user.id))
    });
  },

  async getGroup(req, res) {
    const group = await shareGroupModel.findAccessibleGroupById(req.params.id, req.user.id);

    if (!group) {
      throw notFound('Group not found');
    }

    res.json({
      group: formatGroupResponse(group, req.user.id)
    });
  },

  async updateGroup(req, res) {
    const group = await shareGroupModel.findOwnedGroupById(req.params.id, req.user.id);

    if (!group) {
      throw forbidden('Forbidden');
    }

    const normalizedName = normalizeGroupName(req.body.name);
    const nameKey = buildGroupNameKey(req.user.id, normalizedName);

    if (group.name_key !== nameKey) {
      const existingGroup = await shareGroupModel.findOwnedGroupByNameKey(nameKey, req.user.id);
      if (existingGroup) {
        throw conflict('You already have a group with this name');
      }
    }

    const updatedGroup = await shareGroupModel.updateGroup(group.id, {
      name: normalizedName,
      name_key: nameKey
    });

    logger.info('Share group updated', {
      userId: req.user.id,
      groupId: updatedGroup.id,
      groupName: normalizedName
    });

    res.json({
      group: formatGroupResponse(updatedGroup, req.user.id)
    });
  },

  async deleteGroup(req, res) {
    const group = await shareGroupModel.findOwnedGroupById(req.params.id, req.user.id);

    if (!group) {
      throw forbidden('Forbidden');
    }

    await shareGroupModel.deleteGroup(group.id);

    logger.info('Share group deleted', {
      userId: req.user.id,
      groupId: group.id
    });

    res.status(204).send();
  },

  async inviteMembers(req, res) {
    const group = await shareGroupModel.findOwnedGroupById(req.params.id, req.user.id);

    if (!group) {
      throw forbidden('Forbidden');
    }

    const emails = normalizeInviteEmails(req.body.emails);
    const invitedMembers = [];

    for (const email of emails) {
      const existingMember = await shareGroupModel.findMemberByGroupAndEmail(group.id, email);

      if (existingMember && existingMember.status !== 'REMOVED') {
        throw conflict(`Invite already exists for ${email}`);
      }

      const existingUser = await userModel.findByEmail(email);

      if (existingUser && String(existingUser.id) === String(req.user.id)) {
        throw badRequest('You cannot invite yourself');
      }

      if (existingMember && existingMember.status === 'REMOVED') {
        const restoredMember = await shareGroupModel.updateMember(existingMember.id, {
          user_id: existingUser?.id ?? null,
          status: 'PENDING',
          invited_at: new Date(),
          responded_at: null,
          invited_by_user_id: req.user.id
        });
        invitedMembers.push(restoredMember);
        continue;
      }

      const createdMember = await shareGroupModel.createMemberInvite({
        group: {
          connect: {
            id: group.id
          }
        },
        invited_by_user: {
          connect: {
            id: req.user.id
          }
        },
        ...(existingUser ? {
          user: {
            connect: {
              id: existingUser.id
            }
          }
        } : {}),
        email,
        status: 'PENDING'
      });

      invitedMembers.push(createdMember);
    }

    logger.info('Share group members invited', {
      userId: req.user.id,
      groupId: group.id,
      inviteCount: invitedMembers.length
    });

    const refreshedGroup = await shareGroupModel.findOwnedGroupById(group.id, req.user.id);

    res.status(201).json({
      group: formatGroupResponse(refreshedGroup, req.user.id)
    });
  },

  async removeMember(req, res) {
    const member = await shareGroupModel.findMemberById(req.params.memberId);

    if (!member || member.group_id !== req.params.id) {
      throw notFound('Member invite not found');
    }

    if (String(member.group.owner_user_id) !== String(req.user.id)) {
      throw forbidden('Forbidden');
    }

    await shareGroupModel.updateMember(member.id, {
      status: 'REMOVED',
      responded_at: new Date()
    });

    logger.info('Share group member removed', {
      userId: req.user.id,
      groupId: member.group_id,
      memberId: member.id
    });

    const refreshedGroup = await shareGroupModel.findOwnedGroupById(member.group_id, req.user.id);

    res.json({
      group: formatGroupResponse(refreshedGroup, req.user.id)
    });
  },

  async listMyInvites(req, res) {
    const { status } = req.query;
    const invites = status === 'pending'
      ? await shareGroupModel.findPendingInvitesForUser(req.user.id)
      : await shareGroupModel.findAllInvitesForUser(req.user.id);

    res.json({
      invites: invites.map(formatInviteResponse)
    });
  },

  async acceptInvite(req, res) {
    const member = await shareGroupModel.findMemberById(req.params.memberId);

    if (!member || !member.user_id || String(member.user_id) !== String(req.user.id)) {
      throw notFound('Invite not found');
    }

    if (member.status !== 'PENDING') {
      throw badRequest('Only pending invites can be accepted');
    }

    await shareGroupModel.updateMember(member.id, {
      status: 'ACCEPTED',
      responded_at: new Date()
    });

    logger.info('Share group invite accepted', {
      userId: req.user.id,
      groupId: member.group_id,
      memberId: member.id
    });

    const updatedMember = await shareGroupModel.findMemberById(member.id);

    res.json({
      invite: formatInviteResponse(updatedMember)
    });
  },

  async rejectInvite(req, res) {
    const member = await shareGroupModel.findMemberById(req.params.memberId);

    if (!member || !member.user_id || String(member.user_id) !== String(req.user.id)) {
      throw notFound('Invite not found');
    }

    if (member.status !== 'PENDING') {
      throw badRequest('Only pending invites can be rejected');
    }

    await shareGroupModel.updateMember(member.id, {
      status: 'REJECTED',
      responded_at: new Date()
    });

    logger.info('Share group invite rejected', {
      userId: req.user.id,
      groupId: member.group_id,
      memberId: member.id
    });

    const updatedMember = await shareGroupModel.findMemberById(member.id);

    res.json({
      invite: formatInviteResponse(updatedMember)
    });
  },

  async listGroupImages(req, res) {
    const group = await shareGroupModel.findAccessibleGroupById(req.params.id, req.user.id);

    if (!group) {
      throw notFound('Group not found');
    }

    const parsedLimit = Number(req.query.limit ?? 20);
    const parsedOffset = Number(req.query.offset ?? 0);

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw badRequest('limit must be a number between 1 and 100');
    }

    if (Number.isNaN(parsedOffset) || parsedOffset < 0) {
      throw badRequest('offset must be a number greater than or equal to 0');
    }

    const [groupImages, totalCount] = await Promise.all([
      shareGroupModel.findGroupImages(group.id, parsedLimit, parsedOffset),
      shareGroupModel.countGroupImages(group.id)
    ]);

    res.json({
      group: {
        id: group.id,
        name: group.name
      },
      data: groupImages.map(formatGroupImageResponse),
      totalCount
    });
  },

  async addImagesToGroup(req, res) {
    const group = await shareGroupModel.findOwnedGroupById(req.params.id, req.user.id);

    if (!group) {
      throw forbidden('Forbidden');
    }

    const normalizedImageIds = normalizeImageIds(req.body.imageIds);
    const images = await imageModel.findByIds(normalizedImageIds);

    ensureOwnedImages(images, normalizedImageIds, req.user.id);

    await shareGroupModel.addImagesToGroup(
      normalizedImageIds.map((imageId) => ({
        group_id: group.id,
        image_id: imageId,
        added_by_user_id: req.user.id
      }))
    );

    logger.info('Images added to share group', {
      userId: req.user.id,
      groupId: group.id,
      imageCount: normalizedImageIds.length
    });

    const refreshedGroup = await shareGroupModel.findOwnedGroupById(group.id, req.user.id);

    res.json({
      group: formatGroupResponse(refreshedGroup, req.user.id)
    });
  },

  async removeImagesFromGroup(req, res) {
    const group = await shareGroupModel.findOwnedGroupById(req.params.id, req.user.id);

    if (!group) {
      throw forbidden('Forbidden');
    }

    const normalizedImageIds = normalizeImageIds(req.body.imageIds);
    const existingGroupImages = await shareGroupModel.findGroupImagesByImageIds(group.id, normalizedImageIds);

    if (existingGroupImages.length !== normalizedImageIds.length) {
      throw notFound('One or more images are not present in this group');
    }

    await shareGroupModel.removeImagesFromGroup(group.id, normalizedImageIds);

    logger.info('Images removed from share group', {
      userId: req.user.id,
      groupId: group.id,
      imageCount: normalizedImageIds.length
    });

    const refreshedGroup = await shareGroupModel.findOwnedGroupById(group.id, req.user.id);

    res.json({
      group: formatGroupResponse(refreshedGroup, req.user.id)
    });
  }
};

export default shareGroupController;

function normalizeGroupName(name) {
  const normalizedName = String(name ?? '').trim();

  if (!normalizedName) {
    throw badRequest('name is required');
  }

  if (normalizedName.length > MAX_GROUP_NAME_LENGTH) {
    throw badRequest(`name must be at most ${MAX_GROUP_NAME_LENGTH} characters`);
  }

  if (!GROUP_NAME_REGEX.test(normalizedName)) {
    throw badRequest('name can only contain letters, numbers, underscores, and hyphens');
  }

  return normalizedName;
}

function buildGroupNameKey(userId, groupName) {
  return `${userId}_${groupName.toLowerCase()}`;
}

function formatGroupResponse(group, currentUserId) {
  const memberStatusCounts = group.members.reduce((acc, member) => {
    acc[member.status] = (acc[member.status] || 0) + 1;
    return acc;
  }, {
    PENDING: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    REMOVED: 0
  });

  return {
    id: group.id,
    name: group.name,
    ownerUserId: group.owner_user_id,
    isOwner: String(group.owner_user_id) === String(currentUserId),
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    owner: group.owner,
    imageCount: group._count?.images ?? 0,
    memberCount: group._count?.members ?? 0,
    inviteCounts: {
      pending: memberStatusCounts.PENDING,
      accepted: memberStatusCounts.ACCEPTED,
      rejected: memberStatusCounts.REJECTED,
      removed: memberStatusCounts.REMOVED
    },
    members: group.members.map((member) => ({
      id: member.id,
      email: member.email,
      status: member.status,
      invitedAt: member.invited_at,
      respondedAt: member.responded_at,
      user: member.user
    }))
  };
}

function normalizeInviteEmails(emails) {
  if (!Array.isArray(emails) || !emails.length) {
    throw badRequest('emails must be a non-empty array');
  }

  if (emails.length > 50) {
    throw badRequest('You can invite a maximum of 50 users at a time');
  }

  const normalizedEmails = [...new Set(
    emails
      .map((email) => String(email ?? '').trim().toLowerCase())
      .filter(Boolean)
  )];

  if (!normalizedEmails.length) {
    throw badRequest('emails must contain valid email values');
  }

  const invalidEmail = normalizedEmails.find((email) => !isValidEmail(email));
  if (invalidEmail) {
    throw badRequest(`Invalid email: ${invalidEmail}`);
  }

  return normalizedEmails;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatInviteResponse(member) {
  return {
    id: member.id,
    email: member.email,
    status: member.status,
    invitedAt: member.invited_at,
    respondedAt: member.responded_at,
    group: member.group ? {
      id: member.group.id,
      name: member.group.name,
      ownerUserId: member.group.owner_user_id,
      owner: member.group.owner
    } : undefined,
    user: member.user ?? null
  };
}

function normalizeImageIds(imageIds) {
  if (!Array.isArray(imageIds) || !imageIds.length) {
    throw badRequest('imageIds must be a non-empty array');
  }

  if (imageIds.length > MAX_GROUP_IMAGE_ACTION_COUNT) {
    throw badRequest(`You can update a maximum of ${MAX_GROUP_IMAGE_ACTION_COUNT} images at a time`);
  }

  const normalizedImageIds = [...new Set(
    imageIds.map((imageId) => String(imageId ?? '').trim()).filter(Boolean)
  )];

  if (!normalizedImageIds.length) {
    throw badRequest('imageIds must contain valid values');
  }

  return normalizedImageIds;
}

function ensureOwnedImages(images, requestedIds, userId) {
  if (images.length !== requestedIds.length) {
    throw forbidden('One or more images do not belong to you or do not exist');
  }

  const hasUnownedImage = images.some((image) => String(image.user_id) !== String(userId));
  if (hasUnownedImage) {
    throw forbidden('One or more images do not belong to you');
  }
}

function formatGroupImageResponse(groupImage) {
  return {
    id: groupImage.id,
    addedAt: groupImage.created_at,
    addedBy: groupImage.added_by_user,
    image: groupImage.image
  };
}
