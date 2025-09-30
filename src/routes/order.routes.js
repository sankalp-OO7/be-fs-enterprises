const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const orderController = require("../controllers/order.controller");

router.post("/", auth, orderController.createOrder); // create new order (user)
router.get("/myorders", auth, orderController.getUserOrders); // user order history
router.get("/", auth, isAdmin, orderController.getAllOrders); // admin see all orders
router.patch("/:id/status", auth, isAdmin, orderController.updateOrderStatus); // admin update order status

module.exports = router;
