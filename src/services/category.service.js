const Category = require("../models/category.model.js");

exports.getAllCategories = async () => {
  return await Category.find();
};

exports.getCategoryById = async (id) => {
  return await Category.findById(id);
};

exports.createCategory = async (categoryData) => {
  const category = new Category(categoryData);
  return await category.save();
};

exports.updateCategory = async (id, categoryData) => {
  return await Category.findByIdAndUpdate(id, categoryData, { new: true });
};

exports.deleteCategory = async (id) => {
  return await Category.findByIdAndDelete(id);
};
