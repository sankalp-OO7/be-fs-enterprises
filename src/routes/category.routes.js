const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware.js");
const categoryController = require("../controllers/category.controller.js");

router.get("/", categoryController.getAllCategories);
router.post("/", auth, isAdmin, categoryController.createCategory);
router.get("/:id", categoryController.getCategoryById);
router.put("/:id", auth, isAdmin, categoryController.updateCategory);
router.delete("/:id", auth, isAdmin, categoryController.deleteCategory);

module.exports = router;
