const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const categoryController = require("../controllers/category.controller");

// Public routes - Anyone can view categories
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);

// Admin only routes
router.post("/", auth, isAdmin, categoryController.createCategory);
router.put("/:id", auth, isAdmin, categoryController.updateCategory);
router.delete("/:id", auth, isAdmin, categoryController.deleteCategory);

module.exports = router