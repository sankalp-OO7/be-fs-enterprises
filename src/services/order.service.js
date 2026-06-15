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

// Admin: delete any order by id
exports.deleteOrderById = async (id) => {
  return await Order.findByIdAndDelete(id);
};

// User: delete own completed order only
exports.deleteCompletedOrderByUser = async (id, userId) => {
  const order = await Order.findOne({ _id: id, userId });
  if (!order) throw new Error('Order not found or does not belong to you');
  if (order.status !== 'Completed') throw new Error('Only completed orders can be deleted');
  return await order.deleteOne();
};

