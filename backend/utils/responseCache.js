const { generalCache } = require('./advancedCache');

class ResponseCache {
  constructor() {
    this.cache = generalCache;
  }

  generateKey(req) {
    const { method, path, query, user } = req;
    const userId = user?.id || 'anonymous';
    const queryString = JSON.stringify(query || {});
    return `${method}:${path}:${userId}:${queryString}`;
  }

  cacheMiddleware(ttl = 60 * 1000) {
    return (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = this.generateKey(req);
      const cached = this.cache.get(cacheKey);

      if (cached) {
        console.log(`✅ Cache hit: ${cacheKey}`);
        return res.json(cached);
      }

      const originalJson = res.json.bind(res);

      res.json = (data) => {
        if (res.statusCode === 200) {
          this.cache.set(cacheKey, data, ttl);
          console.log(`💾 Cached: ${cacheKey}`);
        }
        return originalJson(data);
      };

      next();
    };
  }

  clear(pattern) {
    this.cache.clear(pattern);
  }

  clearAll() {
    this.cache.clear();
  }
}

const responseCache = new ResponseCache();
module.exports = responseCache;

