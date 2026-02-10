const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const importController = require("../controllers/import.controller");
const uploadExcel = require("../middleware/uploadExcel");
const multer = require('multer');
// Apply authentication and admin middleware to all import routes
router.use(auth, isAdmin);

// Bulk import products and variants
router.post("/bulk", importController.bulkImportProducts);

router.post("/upload-products-via-excel", 
  (req, res, next) => {
    // Wrap multer middleware to handle errors properly
    uploadExcel(req, res, function(err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
          success: false,
          message: "File upload error",
          error: err.message
        });
      } else if (err) {
        // Other errors (file filter, etc.)
        return res.status(400).json({
          success: false,
          message: "Invalid file",
          error: err.message
        });
      }
      // Everything went fine, proceed to controller
      next();
    });
  },
  importController.importProductsFromExcel
);

// Validate import data structure
router.post("/validate", importController.validateImportData);

// Get import template
router.get("/template", importController.getImportTemplate);


module.exports = router;