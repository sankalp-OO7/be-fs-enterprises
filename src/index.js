const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

const app = express();

// ------------------------------------------------------------------
// FIX: UPDATED CORS CONFIGURATION FOR PRODUCTION DEPLOYMENT
// ------------------------------------------------------------------

// 1. Define allowed origins. Use environment variables for security and flexibility.
// For example:
// In your production .env file (or AWS Lambda environment config) add:
// ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-app-name.vercel.app,https://www.yourcustomdomain.com
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:5173"
).split(",");

// Define the CORS options using a function to check the incoming origin
const corsOptions = {
  // Use a function to dynamically check if the incoming origin is allowed
  origin: (origin, callback) => {
    // Allow requests with no origin (like Postman or curl requests)
    // OR if the origin is explicitly included in our allowed list.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS policy violation: Origin ${origin} not allowed`)
      );
    }
  },

  // 2. CRITICAL FIX: Must be true for the Axios client to successfully send credentials
  //    (like the JWT token or session cookies).
  credentials: true,

  // Optional: You can explicitly list allowed methods
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",

  // Optional: You can explicitly list allowed headers
  allowedHeaders: "Content-Type,Authorization",
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

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/hardware-shop")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Hardware Shop API" });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
