const express = require("express");
const router = express.Router();
const EmployeeController = require("../controllers/employee.controller");
const { verifyToken } = require("../middleware/auth");

// All routes require authentication
router.use(verifyToken);

// Create employee (with profileImage + attachments)
router.post("/create", EmployeeController.createEmployee);

// Update employee (with profileImage + attachments)  { id, ...fields }
router.post("/update", EmployeeController.updateEmployee);

// Get single employee (includes profileImage + attachments in response)  { id }
router.post("/single", EmployeeController.getEmployee);

// List employees (paginated + search)  { page, limit, search }
router.post("/list", EmployeeController.listEmployees);

// Dropdown  (no body needed)
router.post("/dropdown", EmployeeController.getDropdown);

// Delete employee — soft deletes employee + removes all attachments  { id }
router.post("/delete", EmployeeController.deleteEmployee);

module.exports = router;