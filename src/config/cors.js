// src/config/cors.js

// Parse allowed origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];

const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  // If the request has an Origin header and it's allowed, echo it back
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin'); // Important for cache behaviour
  } else {
    // If origin is not allowed, do not set the ACAO header.
    // This will cause the browser to block the request (as it should).
    // Optionally you could set it to '' or omit it entirely.
  }

  // Always set these headers for both actual and preflight requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.status(204).end(); // No content, but with CORS headers set above
    return;
  }

  next();
};

module.exports = { corsMiddleware, allowedOrigins };