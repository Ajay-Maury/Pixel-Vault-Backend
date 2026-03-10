import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';

const userController = {

  async register(req, res) {
    const { email, password, firstName, lastName = '', gender } = req.body;

    const validGenders = ['MALE', 'FEMALE', 'OTHER'];

    if (gender && !validGenders.includes(gender)) {
      return res.status(400).json({
        error: 'Invalid gender. Must be MALE, FEMALE, or OTHER.'
      });
    }

    if (!email || !password || !firstName || !gender) {
      return res.status(400).json({
        message: 'First name, gender, email and password are required'
      });
    }

    try {
      const existing = await userModel.findByEmail(email.toLowerCase());

      if (existing) {
        return res.status(409).json({ message: 'Email already registered' });
      }

      const password_hash = await bcrypt.hash(password, 10);

      const user = await userModel.createUser({
        email: email.toLowerCase(),
        password_hash,
        firstName,
        lastName: lastName || null,
        gender
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

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const user = await userModel.findByEmail(email.toLowerCase());

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email
        }
      });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },


  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'currentPassword and newPassword required'
      });
    }

    try {
      const user = await userModel.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const match = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!match) {
        return res.status(400).json({
          message: 'Current password is incorrect'
        });
      }

      const newHash = await bcrypt.hash(newPassword, 10);

      await userModel.updatePassword(req.user.id, newHash);

      res.json({ message: 'Password changed successfully' });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  },


  async getProfile(req, res) {
    try {
      const user = await userModel.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user?.firstName,
          lastName: user?.lastName,
          gender: user?.gender,
          createdAt: user.created_at,
          totalImages: 0
        }
      });

    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }

};

export default userController;
