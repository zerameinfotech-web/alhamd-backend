const { body, param, query, validationResult } = require("express-validator");

// Validation result checker
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }
  next();
};

// Customer validation rules
const customerValidation = {
  create: [
    body("fullName")
      .trim()
      .notEmpty()
      .withMessage("Full name is required")
      .isLength({ min: 2, max: 255 })
      .withMessage("Full name must be between 2 and 255 characters"),
    body("email")
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be 10 digits"),
    body("accountType")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Account type must be less than 50 characters"),
    body("fullAddress")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage("Address must be less than 500 characters"),
  ],

  update: [
    body("id").isInt().withMessage("Invalid customer ID"),
    body("fullName")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage("Full name must be between 2 and 255 characters"),
    body("email")
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage("Invalid email address")
      .normalizeEmail(),
    body("phone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be 10 digits"),
  ],

  // delete: [param("id").isInt().withMessage("Invalid customer ID")],

  // getById: [param("id").isInt().withMessage("Invalid customer ID")],
};

// Auth validation rules
const authValidation = {
  login: [
    body("phone_number")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be 10 digits"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],

  createAdmin: [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("name")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage("Name must be between 2 and 255 characters"),
    body("phoneNumber")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^[0-9]{10}$/)
      .withMessage("Phone number must be 10 digits"),
    body("secretKey").notEmpty().withMessage("Secret key is required"),
  ],

  changePassword: [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .notEmpty()
      .withMessage("New password is required")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
  ],
};

module.exports = {
  validate,
  customerValidation,
  authValidation,
};