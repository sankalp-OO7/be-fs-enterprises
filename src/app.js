const express = require("express");
const dotenv = require("dotenv");

const { connectDatabase } = require("./config/database");
const corsConfig = require("./config/cors");
const requestLogger = require("./middleware/logger");
const urlRewriter = require("./middleware/urlRewriter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandlers");
const routes = require("./routes");

// Server configuration
dotenv.config();
  
  const app = express();
  const PORT = process.env.PORT || 5000;

// Middleware
app.use(requestLogger);
app.use(corsConfig.middleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(urlRewriter);

// Routes
app.use("/api", routes);

// Error handling
app.use(errorHandler);
app.use(notFoundHandler);

// Local server startup (for development)
const startLocalServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running locally on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🛡️ CORS Allowed Origins: ${corsConfig.allowedOrigins.join(', ')}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/welcome`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

module.exports = { app, startLocalServer };