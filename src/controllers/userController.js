const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

exports.register = async (req, res) => {
  const { email, password, firstName, lastName = '', gender } = req.body;
  const validGenders = ['MALE', 'FEMALE', 'OTHER'];
  if (gender && !validGenders.includes(gender)) {
    return res.status(400).json({ error: 'Invalid gender. Must be MALE, FEMALE, or OTHER.' });
  }
  if (!email || !password || !firstName || !gender) return res.status(400).json({ message: 'First name, gender, email and password are required' });
  try {
    const existing = await userModel.findByEmail(email.toLowerCase());
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await userModel.createUser({
      email: email.toLowerCase(),
      password: password_hash,
      firstName,
      lastName: lastName || null,
      gender
    });
    res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, gender: user.gender, createdAt: user.createdAt } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await userModel.findByEmail(email.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'oldPassword and newPassword required' });
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Old password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await userModel.updatePassword(req.user.id, newHash);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
