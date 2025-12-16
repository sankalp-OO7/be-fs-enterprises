const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const importController = require("../controllers/import.controller");

// Apply authentication and admin middleware to all import routes
router.use(auth, isAdmin);

// Bulk import products and variants
router.post("/bulk", importController.bulkImportProducts);

// Validate import data structure
router.post("/validate", importController.validateImportData);

// Get import template
router.get("/template", importController.getImportTemplate);

module.exports = router;