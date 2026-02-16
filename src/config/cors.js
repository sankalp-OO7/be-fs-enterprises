const cors = require("cors");

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://fsinterprises.vercel.app,http://localhost:5173,http://localhost:3000")
  .split(",")
  .map(o => o.trim())
  .filter(origin => origin.length > 0);

console.log(" CORS Allowed Origins:", allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"]
};

// Create the middleware
const corsMiddleware = cors(corsOptions);

module.exports = {
  corsMiddleware,
  allowedOrigins
};