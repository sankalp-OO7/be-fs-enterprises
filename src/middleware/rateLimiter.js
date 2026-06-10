// src/middleware/rateLimiter.js
const mongoose = require('mongoose');

// Rate limit schema with TTL (auto-delete)
const rateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, index: true },
  count: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now, expires: 60 } // Auto-delete after 60 seconds
});

const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema);

const rateLimiterMiddleware = async (req, res, next) => {
  // Skip for health check
  if (req.path === '/health') {
    return next();
  }

  const key = `${req.ip || req.connection.remoteAddress}:${req.path}`;
  
  // Define limits based on route type
  let maxRequests = 100; // Default
  let windowMs = 60; // seconds
  
  if (req.path.includes('/auth') || req.path.includes('/login')) {
    maxRequests = 5;
    windowMs = 900; // 15 minutes
  } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    maxRequests = 30;
    windowMs = 60; // 1 minute
  }

  try {
    const windowStart = new Date(Date.now() - windowMs * 1000);
    
    // Count requests in current window
    const count = await RateLimit.countDocuments({
      key: key,
      createdAt: { $gte: windowStart }
    });
    
    if (count >= maxRequests) {
      const oldestRequest = await RateLimit.findOne({ key: key })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const retryAfter = oldestRequest
        ? Math.ceil((oldestRequest.createdAt.getTime() + windowMs * 1000 - Date.now()) / 1000)
        : windowMs;
      
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter: retryAfter
      });
    }
    
    // Log this request
    await RateLimit.create({ key: key });
    next();
  } catch (error) {
    console.error('Rate limiter error:', error);
    next(); // Fail open - don't block on error
  }
};

module.exports = { rateLimiterMiddleware };