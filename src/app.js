const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const { connectDatabase } = require("./config/database");
const { corsMiddleware, allowedOrigins } = require("./config/cors");
const requestLogger = require("./middleware/logger");
const urlRewriter = require("./middleware/urlRewriter");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandlers");
const routes = require("./routes");


const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================================
// MIDDLEWARE SETUP - SIMPLIFIED
// =============================================================================

// 1. Request Logger
app.use(requestLogger);

// 2. CORS Middleware (handles both regular and preflight requests)
app.use(corsMiddleware);

// 3. URL Rewriter (if still needed for serverless)
app.use(urlRewriter);

// 4. Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Health check route (simple, no CORS issues)
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin || 'No origin header'
    }
  });
});

// 6. Main API routes
app.use("/api", routes);

// 7. Error handling middleware
app.use(errorHandler);

// 8. 404 handler (MUST be last)
app.use(notFoundHandler);

// Local server startup (for development)
const startLocalServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running locally on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🛡️ CORS Allowed Origins: ${allowedOrigins.join(', ')}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 API Base: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

module.exports = { app, startLocalServer };