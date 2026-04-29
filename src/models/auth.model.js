const DatabaseUtils = require("../utils/database.utils");
const { TABLES, STATUS } = require("../config/constants");

class AuthModel {
  /**
   * Create admin user
   */
  static async createAdmin(adminData) {
    return await DatabaseUtils.insert(TABLES.ADMIN, adminData);
  }

  /**
   * Get admin by email
   */
  static async getByEmail(email) {
    const result = await DatabaseUtils.select(
      TABLES.ADMIN,
      "*",
      "email = ? AND status = ?",
      [email, 1]
    );
    return result[0] || null;
  }

  /**
   * Get admin by phone number
   */
  static async getByPhoneNumber(phoneNumber) {
    const result = await DatabaseUtils.select(
      TABLES.ADMIN,
      "*",
      "phoneNumber = ? AND status = ?",
      [phoneNumber, 1]
    );
    return result[0] || null;
  }

  /**
   * Get admin by ID
   */
  static async getById(id) {
    const result = await DatabaseUtils.selectById(TABLES.ADMIN, id);
    return result[0] || null;
  }

  /**
   * Update admin
   */
  static async update(id, adminData) {
    return await DatabaseUtils.update(TABLES.ADMIN, adminData, "id = ?", [id]);
  }

  /**
   * Update last login
   */
  /**
   * Update login count
   */
  static async updateLoginCount(id) {
    // logincount is varchar, so safely increment handling NULL
    const sql = `UPDATE ${TABLES.ADMIN} SET logincount = COALESCE(logincount, 0) + 1 WHERE id = ?`;
    return await DatabaseUtils.query(sql, [id]);
  }

  // In models/auth.model.js (add new method)
  static async getAllAdmins(page = 1, limit = 10) {
    return await DatabaseUtils.selectPaginated(
      TABLES.ADMIN,
      [
        "id",
        "fullName",
        "email",
        "phoneNumber",
        "role",
        "createdAt",
        "logincount",
        "status",
      ],
      "status = ?",
      [1], // Assuming 1 is active based on schema default
      parseInt(page),
      parseInt(limit),
      "fullName ASC"
    );
  }

  /**
   * Get admin count by role
   */
  static async getCountByRole(role) {
    return await DatabaseUtils.count(TABLES.ADMIN, "role = ? AND status = ?", [
      role,
      1,
    ]);
  }

  /**
   * Check if email exists
   */
  static async emailExists(email, excludeId = null) {
    let whereClause = "email = ?";
    let whereParams = [email];

    if (excludeId) {
      whereClause += " AND id != ?";
      whereParams.push(excludeId);
    }

    return await DatabaseUtils.exists(TABLES.ADMIN, whereClause, whereParams);
  }

  /**
   * Create activity log
   */
  // static async createActivityLog(logData) {
  //   // return await DatabaseUtils.insert(TABLES.ACTIVITY_LOG, logData);
  //   return true;
  // }

  /**
   * Create refresh token
   */
  static async createRefreshToken(tokenData) {
    return await DatabaseUtils.insert(TABLES.REFRESH_TOKENS, tokenData);
  }

  /**
   * Get refresh token
   */
  static async getRefreshToken(token, userId) {
    const result = await DatabaseUtils.select(
      TABLES.REFRESH_TOKENS,
      "*",
      "token = ? AND userId = ? AND expiresAt > NOW()",
      [token, userId]
    );
    return result[0] || null;
  }

  /**
   * Delete refresh token
   */
  static async deleteRefreshToken(token) {
    return await DatabaseUtils.hardDelete(TABLES.REFRESH_TOKENS, "token = ?", [
      token,
    ]);
  }

  /**
   * Delete all user refresh tokens
   */
  static async deleteUserRefreshTokens(userId) {
    return await DatabaseUtils.hardDelete(TABLES.REFRESH_TOKENS, "userId = ?", [
      userId,
    ]);
  }

  /**
   * Get admin dropdown list (for "Paid By" field)
   */
  static async getAdminDropdownList() {
    const sql = `
      SELECT id as value, CONCAT(fullName, ' - ', email) as label, fullName as name, email, role
      FROM ${TABLES.ADMIN}
      WHERE status = ?
      ORDER BY fullName ASC
    `;
    return await DatabaseUtils.query(sql, [1]);
  }
}

module.exports = AuthModel;
