const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_employee";
const ADDRESS_TABLE = "tbl_addressdetails";
const ACCOUNT_TABLE = "tbl_accountdetails";

class EmployeeModel {
  static async create(data) {
    return await DatabaseUtils.insert(TABLE, data);
  }

  static async update(id, data) {
    return await DatabaseUtils.update(TABLE, data, "id = ?", [id]);
  }

  static async getById(id) {
    const sql = `
      SELECT
        e.*,
        a.address, a.cityId, a.stateId, a.countryId, a.postalCode,
        ac.accountHolder, ac.accountNumber, ac.ifscCode, ac.branch AS bankBranch
      FROM ${TABLE} e
      LEFT JOIN ${ADDRESS_TABLE} a ON e.addressId = a.id
      LEFT JOIN ${ACCOUNT_TABLE} ac ON e.accountId = ac.id
      WHERE e.id = ? AND e.status != 0
    `;
    const rows = await DatabaseUtils.query(sql, [id]);
    return rows[0] || null;
  }

  static async getAll(page = 1, limit = 10, search = "") {
    const offset = (page - 1) * limit;
    const whereClauses = ["e.status != 0"];
    const params = [];

    if (search) {
      whereClauses.push(
        "(e.fullName LIKE ? OR e.email LIKE ? OR e.phoneNumber LIKE ?)"
      );
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const where = whereClauses.join(" AND ");

    const sql = `
      SELECT
        e.id, e.status, e.fullName, e.gender, e.dateOfBirth, e.dateOfJoining,
        e.role, e.employeeType, e.phoneNumber, e.email,
        e.companyName, e.gstNumber, e.openingbalance, e.createdAt,
        a.address, a.cityId, a.stateId, a.countryId, a.postalCode,
        ac.accountHolder, ac.accountNumber, ac.ifscCode, ac.branch AS bankBranch
      FROM ${TABLE} e
      LEFT JOIN ${ADDRESS_TABLE} a ON e.addressId = a.id
      LEFT JOIN ${ACCOUNT_TABLE} ac ON e.accountId = ac.id
      WHERE ${where}
      ORDER BY e.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const rows = await DatabaseUtils.query(sql, [...params, limit, offset]);

    const countSql = `SELECT COUNT(*) as count FROM ${TABLE} e WHERE ${where}`;
    const countRows = await DatabaseUtils.query(countSql, params);
    const total = countRows[0]?.count || 0;

    return {
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  static async getDropdown() {
    const sql = `
      SELECT id as value, fullName as label, role, employeeType
      FROM ${TABLE}
      WHERE status != 0
      ORDER BY fullName ASC
    `;
    return await DatabaseUtils.query(sql, []);
  }

  static async softDelete(id) {
    return await DatabaseUtils.update(TABLE, { status: 0 }, "id = ?", [id]);
  }

  static async phoneExists(phoneNumber, excludeId = null) {
    let sql = `SELECT COUNT(*) as count FROM ${TABLE} WHERE phoneNumber = ? AND status != 0`;
    const params = [phoneNumber];
    if (excludeId) { sql += " AND id != ?"; params.push(excludeId); }
    const rows = await DatabaseUtils.query(sql, params);
    return rows[0]?.count > 0;
  }

  static async emailExists(email, excludeId = null) {
    let sql = `SELECT COUNT(*) as count FROM ${TABLE} WHERE email = ? AND status != 0`;
    const params = [email];
    if (excludeId) { sql += " AND id != ?"; params.push(excludeId); }
    const rows = await DatabaseUtils.query(sql, params);
    return rows[0]?.count > 0;
  }
}

module.exports = EmployeeModel;