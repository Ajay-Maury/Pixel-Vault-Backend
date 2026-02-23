const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with email and password
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password (should be strong)
 *             required:
 *               - email
 *               - password
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/user/register
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ message: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), password_hash]
    );
    console.log('[USER] User registered:', { id: result.rows[0].id, email: result.rows[0].email });
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error('[USER REGISTER ERROR]', {
      message: err.message,
      stack: err.stack,
      email: email
    });
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user and get JWT token
 *     description: Authenticate user with email and password, returns JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful, JWT token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token (expires in 7 days)
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/user/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      console.warn('[USER LOGIN] Failed login attempt:', { email });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    if (!process.env.JWT_SECRET) {
      console.error('[USER LOGIN] JWT_SECRET not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('[USER] User logged in:', { id: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('[USER LOGIN ERROR]', {
      message: err.message,
      stack: err.stack,
      email: email
    });
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
