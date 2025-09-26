const Product = require("../models/product.model");

exports.getAllProducts = async () => {
  return await Product.find();
};

exports.getProductById = async (id) => {
  return await Product.findById(id);
};

exports.createProduct = async (productData) => {
  const product = new Product(productData);
  return await product.save();
};

exports.updateProduct = async (id, productData) => {
  return await Product.findByIdAndUpdate(
    id,
    { ...productData, updatedAt: Date.now() },
    { new: true }
  );
};

exports.deleteProduct = async (id) => {
  return await Product.findByIdAndDelete(id);
};
