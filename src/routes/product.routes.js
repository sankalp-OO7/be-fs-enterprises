const express = require("express");
const router = express.Router();
const { auth, isAdmin , optionalAuth} = require("../middleware/auth.middleware");
const productController = require("../controllers/product.controller");

// Public routes
router.get("/",  optionalAuth, productController.getAllProducts);
router.get("/:id",  optionalAuth,productController.getProductById);
router.get("/:productId/variants",  optionalAuth,productController.getProductVariants);

// Admin only routes
router.post("/", auth, isAdmin, productController.createProduct);
router.put("/:id", auth, isAdmin, productController.updateProduct);
router.put('/:id/bulk-update', productController.bulkUpdateProductWithVariants);
router.delete("/:id", auth, isAdmin, productController.deleteProduct);

// Search and filter routes
router.get("/search/filter", productController.filterProducts);
router.get("/category/:categoryId", productController.getProductsByCategory);

module.exports = router;