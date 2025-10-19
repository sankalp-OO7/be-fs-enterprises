const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

// Load environment variables
dotenv.config();

const app = express();

// ------------------------------------------------------------------
// FIX: UPDATED CORS CONFIGURATION
// ------------------------------------------------------------------

// Define the CORS options
const corsOptions = {
  // 1. Specify the exact origin of your frontend development server (Vite default is 5173)
  origin: "http://localhost:5173",

  // 2. CRITICAL FIX: Must be set to true because your Axios client
  //    sends withCredentials: true. This resolves the error.
  credentials: true,

  // Optional: You can explicitly list allowed methods
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",

  // Optional: You can explicitly list allowed headers
  allowedHeaders: "Content-Type,Authorization",
};

// Apply the CORS middleware with the new options
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
