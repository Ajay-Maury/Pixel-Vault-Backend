import prisma from '../prisma.js';

function buildGroupImageWhere(groupId, {
  searchText = '',
  visibility = 'all',
  keyword = '',
  uploaderUserId,
  fromDate,
  toDate
} = {}) {
  const imageFilters = {};

  if (visibility === 'private') {
    imageFilters.is_private = true;
  } else if (visibility === 'public') {
    imageFilters.is_private = false;
  }

  if (searchText) {
    imageFilters.OR = [
      { title: { contains: searchText, mode: 'insensitive' } },
      { description: { contains: searchText, mode: 'insensitive' } }
    ];
  }

  if (keyword) {
    imageFilters.keywords = {
      has: keyword
    };
  }

  const where = {
    group_id: groupId
  };

  if (Object.keys(imageFilters).length) {
    where.image = imageFilters;
  }

  if (uploaderUserId) {
    where.added_by_user_id = uploaderUserId;
  }

  if (fromDate || toDate) {
    where.created_at = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    };
  }

  return where;
}

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

  async findGroupImages(groupId, {
    searchText = '',
    visibility = 'all',
    keyword = '',
    uploaderUserId,
    fromDate,
    toDate,
    sortBy = 'addedAt',
    sortOrder = 'desc',
    limit = 20,
    offset = 0
  } = {}) {
    const orderBy = buildGroupImageOrderBy(sortBy, sortOrder);

    return prisma.share_group_images.findMany({
      where: buildGroupImageWhere(groupId, {
        searchText,
        visibility,
        keyword,
        uploaderUserId,
        fromDate,
        toDate
      }),
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
      orderBy,
      take: limit,
      skip: offset
    });
  },

  async getGroupImageCounts(groupId, filters = {}) {
    const baseWhere = buildGroupImageWhere(groupId, {
      ...filters,
      visibility: 'all'
    });
    const privateWhere = buildGroupImageWhere(groupId, {
      ...filters,
      visibility: 'private'
    });
    const publicWhere = buildGroupImageWhere(groupId, {
      ...filters,
      visibility: 'public'
    });

    const [totalCount, privateCount, publicCount] = await Promise.all([
      prisma.share_group_images.count({ where: baseWhere }),
      prisma.share_group_images.count({ where: privateWhere }),
      prisma.share_group_images.count({ where: publicWhere })
    ]);

    return {
      totalCount,
      privateCount,
      publicCount
    };
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
  },

  async findAccessibleGroupImage(groupId, imageId, userId) {
    return prisma.share_group_images.findFirst({
      where: {
        group_id: groupId,
        image_id: imageId,
        group: {
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
        }
      },
      include: {
        image: true,
        group: {
          select: {
            id: true,
            name: true,
            owner_user_id: true
          }
        }
      }
    });
  },

  async recordGroupImageDownload(data) {
    return prisma.share_group_image_downloads.create({
      data
    });
  },

  async findGroupDownloadHistory(groupId, limit = 20, offset = 0) {
    return prisma.share_group_image_downloads.findMany({
      where: {
        group_id: groupId
      },
      include: {
        image: {
          select: {
            id: true,
            title: true,
            image_url: true,
            is_private: true
          }
        },
        downloader_user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        downloaded_at: 'desc'
      },
      take: limit,
      skip: offset
    });
  },

  async countGroupDownloads(groupId) {
    return prisma.share_group_image_downloads.count({
      where: {
        group_id: groupId
      }
    });
  },

  async getGroupDownloadSummary(groupId) {
    const [totalDownloads, uniqueDownloaders, uniqueImages] = await Promise.all([
      prisma.share_group_image_downloads.count({
        where: { group_id: groupId }
      }),
      prisma.share_group_image_downloads.groupBy({
        by: ['downloader_user_id'],
        where: { group_id: groupId }
      }),
      prisma.share_group_image_downloads.groupBy({
        by: ['image_id'],
        where: { group_id: groupId }
      })
    ]);

    return {
      totalDownloads,
      uniqueDownloaderCount: uniqueDownloaders.length,
      uniqueDownloadedImageCount: uniqueImages.length
    };
  }
};

function buildGroupImageOrderBy(sortBy, sortOrder) {
  const direction = sortOrder === 'asc' ? 'asc' : 'desc';

  switch (sortBy) {
    case 'uploadedAt':
      return { image: { uploaded_at: direction } };
    case 'title':
      return { image: { title: direction } };
    case 'addedBy':
      return { added_by_user: { email: direction } };
    case 'addedAt':
    default:
      return { created_at: direction };
  }
}

export default shareGroupModel;
