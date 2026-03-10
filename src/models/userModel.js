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

  async updatePassword(id, password_hash) {
    return prisma.users.update({
      where: { id },
      data: { password_hash }
    });
  }
};

export default userModel;