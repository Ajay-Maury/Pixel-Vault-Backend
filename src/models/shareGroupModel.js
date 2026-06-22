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
  },

  async findMemberById(memberId) {
    return prisma.share_group_members.findUnique({
      where: { id: memberId },
      include: {
        group: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  },

  async findMemberByGroupAndEmail(groupId, email) {
    return prisma.share_group_members.findFirst({
      where: {
        group_id: groupId,
        email
      }
    });
  },

  async createMemberInvite(data) {
    return prisma.share_group_members.create({
      data
    });
  },

  async updateMember(memberId, data) {
    return prisma.share_group_members.update({
      where: { id: memberId },
      data
    });
  },

  async findPendingInvitesForUser(userId) {
    return prisma.share_group_members.findMany({
      where: {
        user_id: userId,
        status: 'PENDING'
      },
      include: {
        group: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        invited_at: 'desc'
      }
    });
  },

  async findAllInvitesForUser(userId) {
    return prisma.share_group_members.findMany({
      where: {
        user_id: userId
      },
      include: {
        group: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        invited_at: 'desc'
      }
    });
  },

  async findGroupImages(groupId, limit = 20, offset = 0) {
    return prisma.share_group_images.findMany({
      where: {
        group_id: groupId
      },
      include: {
        image: true,
        added_by_user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limit,
      skip: offset
    });
  },

  async countGroupImages(groupId) {
    return prisma.share_group_images.count({
      where: {
        group_id: groupId
      }
    });
  },

  async findGroupImagesByImageIds(groupId, imageIds) {
    return prisma.share_group_images.findMany({
      where: {
        group_id: groupId,
        image_id: {
          in: imageIds
        }
      }
    });
  },

  async addImagesToGroup(entries) {
    return prisma.share_group_images.createMany({
      data: entries,
      skipDuplicates: true
    });
  },

  async removeImagesFromGroup(groupId, imageIds) {
    return prisma.share_group_images.deleteMany({
      where: {
        group_id: groupId,
        image_id: {
          in: imageIds
        }
      }
    });
  }
};

export default shareGroupModel;
