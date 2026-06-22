import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import {
  badRequest,
  conflict,
  internalError,
  notFound,
  unauthorized
} from '../utils/httpError.js';
import logger from '../utils/logger.js';

const validGenders = ['MALE', 'FEMALE', 'OTHER'];

const userController = {

  async register(req, res) {
    const { email, password, firstName, lastName = '', gender } = req.body;

    if (gender && !validGenders.includes(gender)) {
      throw badRequest('Invalid gender. Must be MALE, FEMALE, or OTHER.');
    }

    if (!email || !password || !firstName || !gender) {
      throw badRequest('First name, gender, email and password are required');
    }

    const normalizedEmail = email.toLowerCase();
    const existing = await userModel.findByEmail(normalizedEmail);

    if (existing) {
      throw conflict('Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await userModel.createUser({
      email: normalizedEmail,
      password_hash,
      firstName,
      lastName: lastName || null,
      gender
    });

    logger.info('User registered', {
      userId: user.id,
      email: user.email
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        created_at: user.created_at
      }
    });
  },


  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw badRequest('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findByEmail(normalizedEmail);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      logger.warn('Login failed: invalid credentials', { email: normalizedEmail });
      throw unauthorized('Invalid credentials');
    }

    if (!process.env.JWT_SECRET) {
      throw internalError('Server configuration error');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('User logged in', {
      userId: user.id,
      email: user.email
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });
  },


  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw badRequest('currentPassword and newPassword required');
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      throw notFound('User not found');
    }

    const match = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!match) {
      logger.warn('Password change failed: incorrect current password', {
        userId: req.user.id
      });
      throw badRequest('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await userModel.updatePassword(req.user.id, newHash);

    logger.info('Password changed', { userId: req.user.id });
    res.json({ message: 'Password changed successfully' });
  },


  async getProfile(req, res) {
    const user = await userModel.findProfileById(req.user.id);

    if (!user) {
      throw notFound('User not found');
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        gender: user?.gender,
        createdAt: user.created_at,
        uploadCount: user._count.images
      }
    });
  },

  async searchUsers(req, res) {
    const { email = '', limit = 10 } = req.query;
    const emailQuery = String(email).trim().toLowerCase();
    const parsedLimit = Number(limit);

    if (emailQuery.length < 2) {
      throw badRequest('email query must be at least 2 characters');
    }

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
      throw badRequest('limit must be a number between 1 and 20');
    }

    const users = await userModel.searchUsersByEmail(
      emailQuery,
      req.user.id,
      parsedLimit
    );

    res.json({
      users
    });
  },

  async updateProfile(req, res) {
    const { firstName, lastName, gender } = req.body;

    if (!firstName || !gender) {
      throw badRequest('firstName and gender are required');
    }

    if (!validGenders.includes(gender)) {
      throw badRequest('Invalid gender. Must be MALE, FEMALE, or OTHER.');
    }

    const updatedUser = await userModel.updateProfile(req.user.id, {
      firstName,
      lastName: lastName || null,
      gender
    });

    logger.info('Profile updated', { userId: req.user.id });

    res.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        gender: updatedUser.gender,
        createdAt: updatedUser.created_at
      }
    });
  }

};

export default userController;
