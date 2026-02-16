const serverless = require("serverless-http");
const { app } = require("./src/app");
const { connectDatabase } = require("./src/config/database");

// Connect DB on cold start
connectDatabase().catch(console.error);

module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],

  request: (request, event, context) => {
    request.headers = request.headers || {};
  },

  response: (response) => {
    // Force proper CORS headers from Lambda side
    response.headers["Access-Control-Allow-Origin"] = "https://fsinterprises.vercel.app";
    response.headers["Access-Control-Allow-Credentials"] = "false";
    response.headers["Access-Control-Allow-Headers"] =
      "Content-Type,Authorization,Accept";
    response.headers["Access-Control-Allow-Methods"] =
      "GET,POST,PUT,DELETE,PATCH,OPTIONS";
  }
});
