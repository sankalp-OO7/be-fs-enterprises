const dotenv = require("dotenv");
const { allowedOrigins } = require("../config/cors"); // ✅ Import from your config file

dotenv.config();

const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    cors: {
      allowedOrigins,
      yourOrigin: req.headers?.origin || "No origin header",
    },
  });
};

module.exports = { healthCheck };
