// fileName: auth.controller.js

const User = require("../models/user.model.js");
const authService = require("../services/auth.service.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  // ... (existing code for register)
  try {
    const { username, email, password } = req.body;
    const user = await authService.registerUser(username, email, password);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  // ... (existing code for login)
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// **NEW FUNCTION: exports.registerAdmin**
exports.registerAdmin = async (req, res) => {
  try {
    // Note: In a real-world app, this route would be protected, e.g.,
    // only a super-admin can create new admins. For now, it's public.
    const { username, email, password, secretKey } = req.body;
    const admin = await authService.registerAdminUser(
      username,
      email,
      password,
      secretKey // Add a secret key for a basic layer of protection
    );
    res.status(201).json(admin);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
