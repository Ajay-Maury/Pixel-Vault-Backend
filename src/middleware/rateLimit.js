import { badRequest } from '../utils/httpError.js';

const stores = new Map();

function getStore(storeKey) {
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  return stores.get(storeKey);
}

export default function rateLimit({
  storeKey,
  windowMs,
  maxRequests,
  keyFn
}) {
  return (req, res, next) => {
    const key = keyFn(req);

    if (!key) {
      return next();
    }

    const store = getStore(storeKey);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      store.set(key, {
        count: 1,
        windowStart: now
      });
      return next();
    }

    if (entry.count >= maxRequests) {
      return next(badRequest('Rate limit exceeded. Please try again later.'));
    }

    entry.count += 1;
    return next();
  };
}
