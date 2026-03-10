const prisma = require('../prisma');

module.exports = {
  async createImage(data) {
    return prisma.image.create({ data });
  },
  async findImagesForUser(userId, search, limit, offset) {
    return prisma.image.findMany({
      where: {
        OR: [
          { isPrivate: false },
          { userId }
        ],
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset
    });
  },
  async countImagesForUser(userId, search) {
    return prisma.image.count({
      where: {
        OR: [
          { isPrivate: false },
          { userId }
        ],
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }
    });
  },
  async findById(id) {
    return prisma.image.findUnique({ where: { id } });
  },
  async updateImage(id, data) {
    return prisma.image.update({ where: { id }, data });
  },
  async deleteImage(id) {
    return prisma.image.delete({ where: { id } });
  }
};
