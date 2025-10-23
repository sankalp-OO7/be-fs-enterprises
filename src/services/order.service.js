const Order = require("../models/order.model");

exports.createOrder = async (orderData) => {
  const order = new Order(orderData);
  return await order.save();
};

exports.getOrdersByUser = async (userId) => {
  return await Order.find({ userId }).populate("items.productId");
};

exports.getAllOrders = async () => {
  return await Order.find().populate("userId").populate("items.productId").sort({ createdAt: -1 });
};

exports.getOrderById = async (id) => {
  return await Order.findById(id).populate("userId").populate("items.productId");
};

exports.updateOrderStatus = async (id, status) => {
  return await Order.findByIdAndUpdate(id, { status }, { new: true });
};
