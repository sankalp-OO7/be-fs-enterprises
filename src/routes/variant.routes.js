const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const variantController = require("../controllers/variant.controller");

// Public routes (with role-based price filtering)
router.get("/", variantController.getAllVariants);
router.get("/:id", variantController.getVariantById);

// Admin only routes
router.post("/:productId", auth, isAdmin, variantController.createVariant);
router.put("/:id", auth, isAdmin, variantController.updateVariant);
router.delete("/:id", auth, isAdmin, variantController.deleteVariant);

// Bulk operations
router.post("/bulk/:productId", auth, isAdmin, variantController.bulkCreateVariants);

// Search and filter
router.get("/search/filter", variantController.filterVariants);

module.exports = router;