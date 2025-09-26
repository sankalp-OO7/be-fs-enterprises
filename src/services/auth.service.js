const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const dotenv = require("dotenv");

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@hardware.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_USERNAME = "1";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Function to ensure admin exists
const ensureAdminExists = async () => {
  try {
    let admin = await User.findOne({ email: ADMIN_EMAIL });

    if (!admin) {
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin",
      });
      await admin.save();
      console.log("Admin user created successfully");
    }
  } catch (error) {
    console.error("Error ensuring admin exists:", error);
  }
};

// Call this function when the server starts
ensureAdminExists();

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
    { userId: user._id },
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
