const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const productController = require("../controllers/product.controller");

router.get("/", productController.getAllProducts);
router.post("/", auth, isAdmin, productController.createProduct);
router.get("/:id", productController.getProductById);
router.put("/:id", auth, isAdmin, productController.updateProduct);
router.delete("/:id", auth, isAdmin, productController.deleteProduct);

module.exports = router;
