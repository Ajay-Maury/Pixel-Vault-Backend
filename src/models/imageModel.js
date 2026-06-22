import prisma from '../prisma.js';

function buildImageSearchWhere(userId, search, myLibrary = false) {
  return {
    ...(myLibrary
      ? { user_id: userId }
      : { is_private: false }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    })
  };
}

const imageModel = {
  async createImage(data) {
    return prisma.images.create({ data });
  },
  async findImagesForUser(userId, search, limit, offset, myLibrary = false) {
    return prisma.images.findMany({
      where: buildImageSearchWhere(userId, search, myLibrary),
      orderBy: { uploaded_at: 'desc' },
      take: limit,
      skip: offset
    });
  },

  async countImagesForUser(userId, search, myLibrary = false) {
    return prisma.images.count({
      where: buildImageSearchWhere(userId, search, myLibrary)
    });
  },

  async getImageCountsForUser(userId, search, myLibrary = false) {
    const where = buildImageSearchWhere(userId, search, myLibrary);
    const [totalCount, groupedCounts] = await Promise.all([
      prisma.images.count({ where }),
      prisma.images.groupBy({
        by: ['is_private'],
        where,
        _count: {
          _all: true
        }
      })
    ]);

    const privateCount = groupedCounts.find(item => item.is_private === true)?._count._all ?? 0;
    const publicCount = groupedCounts.find(item => item.is_private === false)?._count._all ?? 0;

    return {
      totalCount,
      privateCount,
      publicCount
    };
  },
  async findById(id) {
    return prisma.images.findUnique({ where: { id } });
  },
  async findByIds(ids) {
    return prisma.images.findMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  },
  async updateImage(id, data) {
    return prisma.images.update({ where: { id }, data });
  },
  async updateImages(ids, data) {
    return prisma.images.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data
    });
  },
  async deleteImage(id) {
    return prisma.images.delete({ where: { id } });
  },
  async deleteImages(ids) {
    return prisma.images.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });
  }
};

export default imageModel;
