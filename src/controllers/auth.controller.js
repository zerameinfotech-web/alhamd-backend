const AuthService = require("../services/auth.service");
const AuthModel = require("../models/auth.model");
const ResponseUtils = require("../utils/response.utils");

class AuthController {
  /**
   * Create admin
   */
  static async createAdmin(req, res, next) {
    try {
      const { email, password, name, secretKey, phoneNumber } = req.body;

      const result = await AuthService.createAdmin(
        { email, password, name, phoneNumber },
        secretKey
      );

      return ResponseUtils.created(res, "Admin account created successfully", {
        adminId: result.adminId,
        email: result.email,
      });
    } catch (error) {
      console.error("Create admin error:", error);

      if (error.message === "Invalid secret key") {
        return ResponseUtils.forbidden(res, error.message);
      }

      if (error.message === "Maximum admin accounts limit reached (4)") {
        return ResponseUtils.badRequest(res, error.message);
      }

      if (error.message === "Email already registered") {
        return ResponseUtils.badRequest(res, error.message);
      }

      next(error);
    }
  }

  /**
   * Create admin (Postman version - no secret key middleware)
   */
  static async createAdminPostman(req, res, next) {
    try {
      const { email, password, name, phoneNumber, secretKey } = req.body;

      // Pass a special flag or null as secret key to service, 
      // or create a separate service method.
      // Here we'll use a separate service method to keep it clean.
      const result = await AuthService.createAdminPostman({
        email, password, name, phoneNumber, secretKey
      });

      return ResponseUtils.created(res, "Admin account created successfully (Postman)", {
        adminId: result.adminId,
        email: result.email,
      });
    } catch (error) {
      console.error("Create admin (Postman) error:", error);

      if (error.message === "Maximum admin accounts limit reached (5)") {
        return ResponseUtils.badRequest(res, error.message);
      }

      if (error.message === "Email already registered") {
        return ResponseUtils.badRequest(res, error.message);
      }

      if (error.message.includes("required")) {
        return ResponseUtils.badRequest(res, error.message);
      }

      next(error);
    }
  }

  /**
   * Admin login
   */
  // static async adminLogin(req, res, next) {
  //   try {
  //     const { email, password } = req.body;

  //     if (!email || !password) {
  //       return ResponseUtils.badRequest(res, "Email and password required");
  //     }

  //     const result = await AuthService.login(email, password, req.ip);

  //     return ResponseUtils.success(res, "Admin login successful", result);
  //   } catch (error) {
  //     console.error("Admin login error:", error);

  //     if (error.message === "Invalid credentials") {
  //       return ResponseUtils.unauthorized(res, "Invalid admin credentials");
  //     }

  //     next(error);
  //   }
  // }
  static async adminLogin(req, res, next) {
    try {
      const { phone_number, password } = req.body;

      if (!phone_number || !password) {
        return ResponseUtils.badRequest(res, "Phone number and password required");
      }

      const result = await AuthService.login(phone_number, password, req.ip);

      return res.status(200).json({
        success: true,
        message: "Login successfully",
        timestamp: new Date().toISOString(),
        response: {
          auth_key: result.auth_key,
          user: result.user,
        }
      });
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "Invalid credentials") {
        return res.status(401).json({
          success: false,
          error: "Invalid credentials",
          timestamp: new Date().toISOString(),
        });
      }

      next(error);
    }
  }

  /**
   * Refresh token
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return ResponseUtils.unauthorized(res, "Refresh token required");
      }

      const result = await AuthService.refreshAccessToken(refreshToken);

      return ResponseUtils.success(res, "Token refreshed successfully", result);
    } catch (error) {
      console.error("Refresh token error:", error);
      return ResponseUtils.unauthorized(res, "Invalid refresh token");
    }
  }

  /**
   * Logout
   */
  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;

      await AuthService.logout(refreshToken);

      return ResponseUtils.success(res, "Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
      next(error);
    }
  }

  /**
   * Get profile
   */
  static async getProfile(req, res, next) {
    try {
      const profile = await AuthService.getProfile(req.user.id);

      return ResponseUtils.success(
        res,
        "Profile retrieved successfully",
        profile
      );
    } catch (error) {
      console.error("Get profile error:", error);

      if (error.message === "User not found") {
        return ResponseUtils.notFound(res, "User not found");
      }

      next(error);
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(req, res, next) {
    try {
      const { name, email } = req.body;

      await AuthService.updateProfile(req.user.id, { name, email });

      return ResponseUtils.success(res, "Profile updated successfully");
    } catch (error) {
      console.error("Update profile error:", error);

      if (error.message === "Email already in use") {
        return ResponseUtils.badRequest(res, error.message);
      }

      next(error);
    }
  }

  // In controllers/auth.controller.js (update getAdminList method)
  static async getAdminList(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const admins = await AuthService.getAdminList(page, limit);
      return res.status(200).json({
        success: true,
        message: "Admin list retrieved successfully",
        timestamp: new Date().toISOString(),
        data: admins.data,
        pagination: admins.pagination,
      });
    } catch (error) {
      console.error("Get admin list error:", error);
      next(error);
    }
  }

  /**
   * Change password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return ResponseUtils.badRequest(
          res,
          "Current password and new password required"
        );
      }

      if (newPassword.length < 6) {
        return ResponseUtils.badRequest(
          res,
          "New password must be at least 6 characters"
        );
      }

      await AuthService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      return ResponseUtils.success(
        res,
        "Password changed successfully. Please login again."
      );
    } catch (error) {
      console.error("Change password error:", error);

      if (error.message === "Current password is incorrect") {
        return ResponseUtils.unauthorized(res, error.message);
      }

      next(error);
    }
  }
  static async getAdminDropdown(req, res, next) {
    try {
      const admins = await AuthModel.getAdminDropdownList();
      return ResponseUtils.success(
        res,
        "Admin dropdown retrieved successfully",
        admins
      );
    } catch (error) {
      console.error("Get admin dropdown error:", error);
      next(error);
    }
  }
}

module.exports = AuthController;
