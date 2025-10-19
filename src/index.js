const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const serverless = require("serverless-http");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------
// CORS CONFIGURATION FOR SERVERLESS
// ------------------------------------------------------------------
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Policy Denied for Origin: ${origin}. Allowed: ${allowedOrigins.join(", ")}`);
      callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization",
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ------------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const productRoutes = require("./routes/product.routes.js");
const categoryRoutes = require("./routes/category.routes.js");
const orderRoutes = require("./routes/order.routes");

// Use routes with /api prefix for local development
// Serverless will handle the path mapping via serverless.yml
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);

// ------------------------------------------------------------------
// HEALTH CHECK & ROOT ENDPOINT
// ------------------------------------------------------------------
app.get("/", (req, res) => {
  res.json({ 
    message: "Hardware Shop API is running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

app.get("/welcome", (req, res) => {
  res.json({ message: "Welcome to Hardware Shop API" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// ------------------------------------------------------------------
// PROXY PATH HANDLING FOR SERVERLESS
// ------------------------------------------------------------------
// This handles the base path mapping when deployed to AWS Lambda
// For example: /dev/api/... or /prod/api/...
app.use((req, res, next) => {
  // Remove the stage prefix (dev, prod, etc.) from the path
  const originalUrl = req.originalUrl;
  const stage = process.env.SERVERLESS_STAGE || 'dev';
  
  if (originalUrl.startsWith(`/${stage}/`)) {
    req.url = originalUrl.replace(`/${stage}`, '');
  }
  next();
});

// ------------------------------------------------------------------
// ERROR HANDLING MIDDLEWARE
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CORS errors
  if (err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation: Origin not allowed"
    });
  }
  
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production" 
      ? "Internal Server Error" 
      : err.message,
  });
});

// 404 Handler - MUST be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ------------------------------------------------------------------
// DATABASE CONNECTION & SERVERLESS CONFIG
// ------------------------------------------------------------------

let isDatabaseConnected = false;

const connectDatabase = async () => {
  try {
    if (!isDatabaseConnected) {
      await mongoose.connect(
        process.env.MONGODB_URI || "mongodb://localhost:27017/hardware-shop",
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );
      isDatabaseConnected = true;
      console.log("✅ Connected to MongoDB");
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    isDatabaseConnected = false;
  }
};

// For local development
if (process.env.IS_OFFLINE || process.env.NODE_ENV === 'development') {
  connectDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running locally on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  });
} else {
  // For Lambda - connect on cold start
  connectDatabase();
}

// Export the serverless handler
module.exports.handler = serverless(app, {
  // Add binary support if needed
  binary: ['image/*', 'application/pdf']
});

// Export app for testing
module.exports.app = app;