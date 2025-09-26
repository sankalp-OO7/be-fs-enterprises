const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth.middleware");
const userController = require("../controllers/user.controller");

router.get("/", auth, isAdmin, userController.getAllUsers);
router.post("/", auth, isAdmin, userController.createUser);
router.get("/:id", auth, isAdmin, userController.getUserById);
router.put("/:id", auth, isAdmin, userController.updateUser);
router.delete("/:id", auth, isAdmin, userController.deleteUser);

module.exports = router;
