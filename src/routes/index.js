const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const categoryRoutes = require("./category.routes");
const orderRoutes = require("./order.routes");
const uploadRoutes = require('./upload.routes');
const { getHealthStatus } = require("../controllers/healthController");

// Health check route
router.get("/welcome", getHealthStatus);

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use('/upload', uploadRoutes);

module.exports = router;