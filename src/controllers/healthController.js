const { getDatabaseStatus } = require("../config/database");
const corsConfig = require("../config/cors");

const getHealthStatus = (req, res) => {
  res.json({ 
    message: "Hardware Shop API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: getDatabaseStatus(),
    origin: req.headers.origin || 'none',
    cors: {
      allowedOrigins: corsConfig.allowedOrigins,
      yourOrigin: req.headers.origin || 'none'
    }
  });
};

module.exports = {
  getHealthStatus,
};