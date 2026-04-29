const EmployeeService = require("../services/employee.service");
const ResponseUtils = require("../utils/response.utils");

class EmployeeController {
  /**
   * POST /api/employees/create
   */
  static async createEmployee(req, res, next) {
    try {
      const result = await EmployeeService.createEmployee(req.body);
      return ResponseUtils.created(res, "Employee created successfully", result);
    } catch (error) {
      console.error("Create employee error:", error);
      if (
        error.message === "Phone number already registered" ||
        error.message === "Email already registered" ||
        error.message.includes("required")
      ) {
        return ResponseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /api/employees/update
   * Body: { id, ...fieldsToUpdate, profileImage?, attachments? }
   */
  static async updateEmployee(req, res, next) {
    try {
      const { id, ...data } = req.body;
      if (!id) {
        return ResponseUtils.badRequest(res, "Employee id is required");
      }
      const result = await EmployeeService.updateEmployee(parseInt(id), data);
      return ResponseUtils.success(res, "Employee updated successfully", result);
    } catch (error) {
      console.error("Update employee error:", error);
      if (error.message === "Employee not found") {
        return ResponseUtils.notFound(res, error.message);
      }
      if (
        error.message === "Phone number already in use" ||
        error.message === "Email already in use"
      ) {
        return ResponseUtils.badRequest(res, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /api/employees/single
   * Body: { id }
   */
  static async getEmployee(req, res, next) {
    try {
      const { id, empId } = req.body;
      const employeeId = id || empId;
      if (!employeeId) {
        return ResponseUtils.badRequest(res, "Employee id is required");
      }
      const employee = await EmployeeService.getEmployee(parseInt(employeeId));
      return ResponseUtils.success(res, "Employee retrieved successfully", employee);
    } catch (error) {
      console.error("Get employee error:", error);
      if (error.message === "Employee not found") {
        return ResponseUtils.notFound(res, error.message);
      }
      next(error);
    }
  }

  /**
   * POST /api/employees/list
   * Body: { page, limit, search }
   */
  static async listEmployees(req, res, next) {
    try {
      const { page = 1, limit = 10, search = "", searchTerm = "", role = [], employeeId = [] } = req.body;
      const result = await EmployeeService.listEmployees(
        parseInt(page),
        parseInt(limit),
        search || searchTerm
      );
      return res.status(200).json({
        success: true,
        message: "Employees retrieved successfully",
        timestamp: new Date().toISOString(),
        ...result, // spreads { list, totalCount }
      });
    } catch (error) {
      console.error("List employees error:", error);
      next(error);
    }
  }

  /**
   * POST /api/employees/dropdown
   * Body: {} (no body needed)
   */
  static async getDropdown(req, res, next) {
    try {
      const employees = await EmployeeService.getDropdown();
      return ResponseUtils.success(
        res,
        "Employee dropdown retrieved successfully",
        employees
      );
    } catch (error) {
      console.error("Employee dropdown error:", error);
      next(error);
    }
  }

  /**
   * POST /api/employees/delete
   * Body: { id }
   */
  static async deleteEmployee(req, res, next) {
    try {
      const { id } = req.body;
      if (!id) {
        return ResponseUtils.badRequest(res, "Employee id is required");
      }
      await EmployeeService.deleteEmployee(parseInt(id));
      return ResponseUtils.success(res, "Employee deleted successfully");
    } catch (error) {
      console.error("Delete employee error:", error);
      if (error.message === "Employee not found") {
        return ResponseUtils.notFound(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = EmployeeController;