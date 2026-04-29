const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth");
const { authValidation, validate } = require("../middleware/validator");

// Public routes
router.post(
  "/admin/login",
  authValidation.login,
  validate,
  AuthController.adminLogin
);

router.post(
  "/admin/create",
  authValidation.createAdmin,
  validate,
  AuthController.createAdmin
);

// Public route for Postman (no secret key validation middleware, but validation inside controller/service if needed)
router.post(
  "/admin/create-postman",
  AuthController.createAdminPostman
);

router.post("/refresh-token", AuthController.refreshToken);
router.post("/admin-dropdown", AuthController.getAdminDropdown);
// Protected routes
router.post("/logout", verifyToken, AuthController.logout);

router.post("/me", verifyToken, AuthController.getProfile);

router.put("/update-profile", verifyToken, AuthController.updateProfile);

router.post("/admin/list", verifyToken, AuthController.getAdminList);

router.put(
  "/change-password",
  verifyToken,
  authValidation.changePassword,
  validate,
  AuthController.changePassword
);


module.exports = router;
