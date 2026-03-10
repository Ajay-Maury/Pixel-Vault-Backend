import prisma from '../prisma.js';

const userModel = {
  async findByEmail(email) {
    return prisma.users.findUnique({ where: { email } });
  },

  async createUser(data) {
    return prisma.users.create({ data });
  },

  async findById(id) {
    return prisma.users.findUnique({ where: { id } });
  },

  async findProfileById(id) {
    return prisma.users.findUnique({
      where: { id },
      include: {
        _count: {
          select: { images: true }
        }
      }
    });
  },

  async updatePassword(id, password_hash) {
    return prisma.users.update({
      where: { id },
      data: { password_hash }
    });
  },

  async updateProfile(id, data) {
    return prisma.users.update({
      where: { id },
      data
    });
  }
};

export default userModel;
