const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");


const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";


exports.registerUser = async (username, email, password) => {
  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = new User({
    username,
    email,
    password: hashedPassword,
  });

  await user.save();

  // Remove password from response
  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

exports.loginUser = async (email, password) => {
  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Invalid credentials");
  }

  // Generate token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "24h" }
  );

  // Remove password from response
  const userObject = user.toObject();
  delete userObject.password;

  return {
    user: userObject,
    token,
  };
};
exports.registerAdminUser = async (username, email, password, secretKey) => {
  // 1. Check for the secret key
  if (secretKey !== JWT_SECRET) {
    throw new Error("Invalid secret key for admin registration");
  }

  // 2. Check if admin already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // 3. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Create admin user with role: "admin"
  const admin = new User({
    username,
    email,
    password: hashedPassword,
    role: "admin", // Key difference: set role to 'admin'
  });

  await admin.save();

  // 5. Remove password from response
  const adminObject = admin.toObject();
  delete adminObject.password;

  return adminObject;
};
