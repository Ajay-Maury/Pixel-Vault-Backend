import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/httpError.js';
import logger from '../utils/logger.js';

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Authentication failed: missing bearer token', {
      path: req.path,
      method: req.method
    });
    return next(unauthorized('Unauthorized'));
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    logger.warn('Authentication failed: invalid token', {
      path: req.path,
      method: req.method,
      error: err
    });
    return next(unauthorized('Invalid token'));
  }
};

export default authMiddleware;
