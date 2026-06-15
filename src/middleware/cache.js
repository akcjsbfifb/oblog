const cache = require('../markdown/cache');

function cacheMiddleware(req, res, next) {
  const slug = req.params.slug;
  if (!slug) return next();

  const cached = cache.get(slug);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.send(cached);
  }

  // Intercept res.send to save to cache
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    if (res.statusCode === 200 && typeof body === 'string') {
      cache.set(slug, body);
      res.setHeader('X-Cache', 'MISS');
    }
    return originalSend(body);
  };

  next();
}

module.exports = cacheMiddleware;
