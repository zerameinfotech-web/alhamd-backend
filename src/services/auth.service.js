const bcrypt = require("bcryptjs");
const AuthModel = require("../models/auth.model");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../middleware/auth");
const { ROLES, STATUS } = require("../config/constants");

class AuthService {
  /**
   * Create admin account
   */
  static async createAdmin(adminData, secretKey) {
    // Verify secret key
    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      throw new Error("Invalid secret key");
    }

    // Check admin count limit
    const adminCount = await AuthModel.getCountByRole(ROLES.ADMIN);
    if (adminCount >= 5) {
      throw new Error("Maximum admin accounts limit reached (5)");
    }

    // Check if email already exists
    const emailExists = await AuthModel.emailExists(adminData.email);
    if (emailExists) {
      throw new Error("Email already registered");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const data = {
      email: adminData.email,
      password: passwordHash, // Schema has 'password' column
      fullName: adminData.name || "Admin", // Schema has 'fullName'
      role: ROLES.ADMIN,
      phoneNumber: adminData.phoneNumber || "",
      status: 1, // Schema uses int status default 1
      // Required fields with defaults
      gender: "Male",
      employeeType: "Full Time",
      billingaddressId: "0",
      companyName: "alhamdoverseas",
      gstNumber: "",
      logincount: "0",
      openingbalance: "0",
    };

    const adminId = await AuthModel.createAdmin(data);

    return { adminId, email: adminData.email };
  }

  /**
   * Create admin (Postman version - skips secret key check)
   */
  static async createAdminPostman(adminData) {
    // Basic validation
    if (!adminData.email || !adminData.password) {
      throw new Error("Email and password are required");
    }

    // Check admin count limit
    const adminCount = await AuthModel.getCountByRole(ROLES.ADMIN);
    if (adminCount >= 5) {
      throw new Error("Maximum admin accounts limit reached (5)");
    }

    // Check if email already exists
    const emailExists = await AuthModel.emailExists(adminData.email);
    if (emailExists) {
      throw new Error("Email already registered");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminData.password, salt);

    // Create admin
    const data = {
      email: adminData.email,
      password: passwordHash, // Schema has 'password' column
      fullName: adminData.name || "Admin", // Schema has 'fullName'
      role: ROLES.ADMIN,
      phoneNumber: adminData.phoneNumber || "",
      status: 1, // Schema uses int status default 1
      // Required fields with defaults
      gender: "Male",
      employeeType: "Full Time",
      billingaddressId: "0",
      companyName: "alhamdoverseas",
      gstNumber: "",
      logincount: "0",
      openingbalance: "0",
    };

    const adminId = await AuthModel.createAdmin(data);

    return { adminId, email: adminData.email };
  }

  /**
   * Admin login
   */
  static async login(phoneNumber, password, ipAddress) {
    // Get admin by phone number
    const admin = await AuthModel.getByPhoneNumber(phoneNumber);

    if (!admin) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password); // Schema has 'password'
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // Update last login / login count
    // tbl_employee has no lastLogin, only logincount
    await AuthModel.updateLoginCount(admin.id);

    // Log activity
    // await AuthModel.createActivityLog({
    //   adminId: admin.id,
    //   actionType: "LOGIN",
    //   description: `${admin.fullName || admin.email} logged in`, // Schema has 'fullName'
    //   ipAddress,
    // });

    // Generate tokens
    const accessToken = generateAccessToken(admin);
    const refreshToken = await generateRefreshToken(admin);

    return {
      auth_key: accessToken,
      refreshToken,
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        name: admin.fullName,
        role: admin.role,
        phoneNumber: admin.phoneNumber,
        employeeType: admin.employeeType,
      },
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken) {
    const jwt = require("jsonwebtoken");

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if token exists in database
    const tokenRecord = await AuthModel.getRefreshToken(
      refreshToken,
      decoded.id
    );
    if (!tokenRecord) {
      throw new Error("Invalid refresh token");
    }

    // Get user
    const admin = await AuthModel.getById(decoded.id);
    if (!admin) {
      throw new Error("User not found");
    }

    // Generate new access token
    const accessToken = generateAccessToken(admin);

    return { accessToken };
  }

  /**
   * Logout
   */
  static async logout(refreshToken) {
    if (refreshToken) {
      await AuthModel.deleteRefreshToken(refreshToken);
    }
    return true;
  }

  /**
   * Get user profile
   */
  static async getProfile(userId) {
    const admin = await AuthModel.getById(userId);
    if (!admin) {
      throw new Error("User not found");
    }

    return {
      id: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      name: admin.fullName,
      role: admin.role,
      phoneNumber: admin.phoneNumber,
      createdAt: admin.createdAt,
    };
  }

  /**
   * Update profile
   */
  static async updateProfile(userId, profileData) {
    const admin = await AuthModel.getById(userId);
    if (!admin) {
      throw new Error("User not found");
    }

    // Check if email already exists (if changing)
    if (profileData.email && profileData.email !== admin.email) {
      const emailExists = await AuthModel.emailExists(
        profileData.email,
        userId
      );
      if (emailExists) {
        throw new Error("Email already in use");
      }
    }

    const updateData = {
      fullName: profileData.name, // Map name to fullName
      email: profileData.email,
      // No updatedAt column in tbl_employee
    };

    await AuthModel.update(userId, updateData);

    return true;
  }

  // In services/auth.service.js (add new method)
  static async getAdminList(page = 1, limit = 10) {
    return await AuthModel.getAllAdmins(page, limit);
  }

  /**
   * Change password
   */
  static async changePassword(userId, currentPassword, newPassword) {
    const admin = await AuthModel.getById(userId);
    if (!admin) {
      throw new Error("User not found");
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await AuthModel.update(userId, {
      password: newPasswordHash,
      // No updatedAt
    });

    // Delete all refresh tokens (force re-login)
    await AuthModel.deleteUserRefreshTokens(userId);

    return true;
  }
}

module.exports = AuthService;