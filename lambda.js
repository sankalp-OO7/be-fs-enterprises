const serverless = require("serverless-http");
const { app } = require("./src/app");
const { connectDatabase } = require("./src/config/database");

// Connect to database on cold start
connectDatabase();

// Export the serverless handler
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf']
});