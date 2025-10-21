const { startLocalServer } = require("./app");

// Only start local server if not in serverless environment
if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
  startLocalServer();
}