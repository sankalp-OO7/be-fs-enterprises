const cors = require("cors");

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://fsinterprises.vercel.app,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map(o => o.trim())
  .filter(origin => origin.length > 0);

console.log("🛡️ CORS Allowed Origins:", allowedOrigins);

// SIMPLIFIED CORS CONFIGURATION
const corsOptions = {
  origin: allowedOrigins, // Use simple array instead of function
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Create the middleware
const corsMiddleware = cors(corsOptions);

module.exports = {
  corsMiddleware,
  allowedOrigins
};