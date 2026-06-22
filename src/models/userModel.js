import prisma from '../prisma.js';

const userModel = {
  async findByEmail(email) {
    return prisma.users.findUnique({ where: { email } });
  },

  async createUser(data) {
    return prisma.users.create({ data });
  },

  async attachPendingInvitesByEmail(email, userId) {
    return prisma.share_group_members.updateMany({
      where: {
        email,
        user_id: null,
        status: 'PENDING'
      },
      data: {
        user_id: userId
      }
    });
  },

  async findById(id) {
    return prisma.users.findUnique({ where: { id } });
  },

  async searchUsersByEmail(emailQuery, excludeUserId, limit = 10) {
    return prisma.users.findMany({
      where: {
        email: {
          contains: emailQuery,
          mode: 'insensitive'
        },
        id: {
          not: excludeUserId
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true
      },
      orderBy: {
        email: 'asc'
      },
      take: limit
    });
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
