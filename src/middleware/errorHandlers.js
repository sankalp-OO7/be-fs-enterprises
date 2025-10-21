const corsConfig = require("../config/cors");

const errorHandler = (err, req, res, next) => {
  console.error("💥 Error:", err.stack);
  
  corsConfig.errorHandler(err, req, res, next);
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production" 
      ? "Internal Server Error" 
      : err.message,
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      "/api/welcome",
      "/api/auth/*", 
      "/api/users/*", 
      "/api/products/*",
      "/api/categories/*",
      "/api/orders/*"
    ]
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};