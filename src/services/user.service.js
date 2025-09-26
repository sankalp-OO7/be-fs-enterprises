const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

exports.getAllUsers = async () => {
  return await User.find().select("-password");
};

exports.getUserById = async (id) => {
  return await User.findById(id).select("-password");
};

exports.createUser = async (userData) => {
  const { password, ...otherData } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = new User({
    ...otherData,
    password: hashedPassword,
  });

  await user.save();
  const userObject = user.toObject();
  delete userObject.password;
  return userObject;
};

exports.updateUser = async (id, userData) => {
  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }

  const user = await User.findByIdAndUpdate(id, userData, { new: true }).select(
    "-password"
  );

  return user;
};

exports.deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};
