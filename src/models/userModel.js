const prisma = require('../prisma');

module.exports = {
  async findByEmail(email) {
    return prisma.user.findUnique({ where: { email } });
  },
  async createUser(data) {
    return prisma.user.create({ data });
  },
  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },
  async updatePassword(id, password) {
    return prisma.user.update({ where: { id }, data: { password } });
  }
};
