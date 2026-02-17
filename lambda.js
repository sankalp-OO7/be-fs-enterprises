const serverless = require("serverless-http");
const { app } = require("./src/app");
const { connectDatabase } = require("./src/config/database");

// Connect to database on cold start
connectDatabase().catch(console.error);

// Export the serverless handler
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
  // Additional serverless-http options for better CORS handling
  request: function(request, event, context) {
    // Preserve original headers
    request.headers = request.headers || {};
  }
});