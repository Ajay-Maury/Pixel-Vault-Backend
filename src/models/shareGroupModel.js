import prisma from '../prisma.js';

const shareGroupInclude = {
  owner: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  _count: {
    select: {
      members: true,
      images: true
    }
  },
  members: {
    select: {
      id: true,
      email: true,
      status: true,
      invited_at: true,
      responded_at: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: {
      invited_at: 'desc'
    }
  }
};

const shareGroupModel = {
  async createGroup(data) {
    return prisma.share_groups.create({
      data,
      include: shareGroupInclude
    });
  },

  async findOwnedGroups(ownerUserId) {
    return prisma.share_groups.findMany({
      where: { owner_user_id: ownerUserId },
      include: shareGroupInclude,
      orderBy: {
        created_at: 'desc'
      }
    });
  },

  async findJoinedGroups(userId) {
    return prisma.share_groups.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
            status: 'ACCEPTED'
          }
        }
      },
      include: shareGroupInclude,
      orderBy: {
        created_at: 'desc'
      }
    });
  },

  async findOwnedGroupById(groupId, ownerUserId) {
    return prisma.share_groups.findFirst({
      where: {
        id: groupId,
        owner_user_id: ownerUserId
      },
      include: shareGroupInclude
    });
  },

  async findAccessibleGroupById(groupId, userId) {
    return prisma.share_groups.findFirst({
      where: {
        id: groupId,
        OR: [
          { owner_user_id: userId },
          {
            members: {
              some: {
                user_id: userId,
                status: 'ACCEPTED'
              }
            }
          }
        ]
      },
      include: shareGroupInclude
    });
  },

  async findOwnedGroupByNameKey(nameKey, ownerUserId) {
    return prisma.share_groups.findFirst({
      where: {
        name_key: nameKey,
        owner_user_id: ownerUserId
      }
    });
  },

  async updateGroup(groupId, data) {
    return prisma.share_groups.update({
      where: { id: groupId },
      data,
      include: shareGroupInclude
    });
  },

  async deleteGroup(groupId) {
    return prisma.share_groups.delete({
      where: { id: groupId }
    });
  }
};

export default shareGroupModel;
