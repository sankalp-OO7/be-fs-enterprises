const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const serverless = require("serverless-http"); // ✅ ADD THIS

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------
// FIX: UPDATED CORS CONFIGURATION FOR PRODUCTION DEPLOYMENT
// ------------------------------------------------------------------

// 1. Define allowed origins. Use environment variables for security and flexibility.
// Example for .env: ALLOWED_ORIGINS=http://localhost:5173,https://your-production-frontend.com
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim()); // Trim whitespace for safety

// Define the CORS options using a function to check the incoming origin
const corsOptions = {
  // Use a function to dynamically check if the incoming origin is allowed
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or curl requests)
    // OR if the origin is explicitly included in our allowed list.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Production Enhancement: Log the rejected origin for server-side debugging
      console.error(
        `CORS Policy Denied for Origin: ${origin}. Allowed: ${allowedOrigins.join(
          ", "
        )}`
      );
      callback(
        new Error(`CORS policy violation: Origin ${origin} not allowed`)
      );
    }
  },

  // CRITICAL FIX: Must be true for the Axios client to successfully send credentials
  credentials: true,

  // Optional: You can explicitly list allowed methods
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",

  // Optional: You can explicitly list allowed headers
  allowedHeaders: "Content-Type,Authorization",

  // Cache preflight requests for 24 hours (86400 seconds) to improve performance
  maxAge: 86400,
};

// Apply the CORS middleware with the dynamic options
app.use(cors(corsOptions));

// ------------------------------------------------------------------
// END OF CORS FIX
// ------------------------------------------------------------------

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const productRoutes = require("./routes/product.routes.js");
const categoryRoutes = require("./routes/category.routes.js");
const orderRoutes = require("./routes/order.routes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);

// Basic route
app.get("/welcome", (req, res) => {
  res.json({ message: "Welcome to Hardware Shop API" });
});

// Production Enhancement: Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the error stack for debugging
  // Determine status code. Default to 500 if status is not set.
  const statusCode = err.status || 500;
  // Send a generic error response in production
  res.status(statusCode).send({
    success: false,
    message:
      statusCode === 500 && process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

// ------------------------------------------------------------------
// Production Enhancement: Start server ONLY after MongoDB connection
// ------------------------------------------------------------------
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hardware-shop")
  .then(() => {
    console.log("Connected to MongoDB");
    // Start server only upon successful DB connection
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err) => {
    // Log error and exit process if DB connection fails
    console.error("FATAL: MongoDB connection error:", err.message);
    process.exit(1);
  });
