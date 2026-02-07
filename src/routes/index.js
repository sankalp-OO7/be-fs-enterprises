const express = require("express");
const router = express.Router();

// Import route modules
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const productRoutes = require("./product.routes");
const variantRoutes = require("./variant.routes"); // NEW
const categoryRoutes = require("./category.routes");
const orderRoutes = require("./order.routes");
const uploadRoutes = require('./upload.routes');
const importRoutes = require("./import.routes"); // NEW
const { getHealthStatus } = require("../controllers/healthController");

// Health check route
router.get("/welcome", getHealthStatus);

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/variants", variantRoutes); // NEW
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/import", importRoutes); // NEW
router.use('/upload', uploadRoutes);

// API documentation/info route
router.get("/", (req, res) => {
  res.json({
    message: "Product Management API",
    version: "1.0.0",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        logout: "POST /api/auth/logout",
        refresh: "POST /api/auth/refresh"
      },
      users: {
        profile: "GET /api/users/profile",
        updateProfile: "PUT /api/users/profile"
      },
      products: {
        getAll: "GET /api/products",
        getSingle: "GET /api/products/:id",
        create: "POST /api/products",
        update: "PUT /api/products/:id",
        delete: "DELETE /api/products/:id",
        variants: "GET /api/products/:productId/variants",
        filter: "GET /api/products/search/filter",
        byCategory: "GET /api/products/category/:categoryId"
      },
      variants: {
        getAll: "GET /api/variants",
        getSingle: "GET /api/variants/:id",
        create: "POST /api/variants/:productId",
        update: "PUT /api/variants/:id",
        delete: "DELETE /api/variants/:id",
        bulkCreate: "POST /api/variants/bulk/:productId",
        filter: "GET /api/variants/search/filter"
      },
      categories: {
        getAll: "GET /api/categories",
        getSingle: "GET /api/categories/:id",
        create: "POST /api/categories",
        update: "PUT /api/categories/:id",
        delete: "DELETE /api/categories/:id"
      },
      import: {
        bulkImport: "POST /api/import/bulk",
        validate: "POST /api/import/validate",
        template: "GET /api/import/template"
      },
      orders: {
        getAll: "GET /api/orders",
        create: "POST /api/orders",
        getSingle: "GET /api/orders/:id",
        update: "PUT /api/orders/:id"
      },
      upload: {
        single: "POST /api/uploads/upload",
        multiple: "POST /api/upload/multiple"
      },
      system: {
        health: "GET /api/welcome",
        info: "GET /api/"
      }
    },
    notes: [
      "Admin endpoints require admin role",
      "Most POST/PUT/DELETE operations require authentication",
      "Variant prices are hidden for non-admin users"
    ]
  });
});

module.exports = router;