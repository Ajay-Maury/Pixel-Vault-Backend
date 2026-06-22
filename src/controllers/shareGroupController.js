import shareGroupModel from '../models/shareGroupModel.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import logger from '../utils/logger.js';

const MAX_GROUP_NAME_LENGTH = 10;
const GROUP_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

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
