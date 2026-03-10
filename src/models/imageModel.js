import prisma from '../prisma.js';

 const imageModel = {
  async createImage(data) {
    return prisma.images.create({ data });
  },
  async findImagesForUser(userId, search, limit, offset, myLibrary = false) {
    return prisma.images.findMany({
      where: {
        ...(myLibrary
          ? { user_id: userId }
          : { is_private: false }),

        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { uploaded_at: 'desc' },
      take: limit,
      skip: offset
    });
  },

  async countImagesForUser(userId, search) {
    return prisma.images.count({
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
    return prisma.images.findUnique({ where: { id } });
  },
  async updateImage(id, data) {
    return prisma.images.update({ where: { id }, data });
  },
  async deleteImage(id) {
    return prisma.images.delete({ where: { id } });
  }
};

export default imageModel;
