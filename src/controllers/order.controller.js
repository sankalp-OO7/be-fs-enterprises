const orderService = require("../services/order.service");

exports.createOrder = async (req, res) => {
  try {
    // Normally get user info from auth middleware
    const userId = req.user._id;

    // Validate and parse order from req.body
    const orderData = {
      ...req.body,
      userId,
    };

    const order = await orderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await orderService.getOrdersByUser(userId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const updatedOrder = await orderService.updateOrderStatus(req.params.id, req.body.status);
    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Admin: delete any order
exports.deleteOrder = async (req, res) => {
  try {
    const deleted = await orderService.deleteOrderById(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User: delete their own completed order
exports.deleteMyCompletedOrder = async (req, res) => {
  try {
    await orderService.deleteCompletedOrderByUser(req.params.id, req.user._id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

