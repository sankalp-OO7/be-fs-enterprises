const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller.js");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/register-admin", authController.registerAdmin);

module.exports = router;
