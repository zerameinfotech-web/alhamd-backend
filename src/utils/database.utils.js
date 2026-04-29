const { promisePool } = require("../config/database");
const { STATUS } = require("../config/constants");

class DatabaseUtils {
  /**
   * Generic INSERT operation
   * @param {string} tableName - Table name
   * @param {object} data - Data to insert
   * @param {object} connection - Optional database connection (for transactions)
   * @returns {number} Insert ID
   */
  static _mapValue(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'object' && !(v instanceof Date) && !Buffer.isBuffer(v)) return JSON.stringify(v);
    return v;
  }

  static async insert(tableName, data, connection = null) {
    try {
      const db = connection || promisePool;
      const columns = Object.keys(data);
      const values = Object.values(data).map(this._mapValue);
      const placeholders = columns.map(() => "?").join(", ");

      const sql = `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;

      // console.log("Executing SQL (insert):", sql);
      const [result] = await db.execute(sql, values);
      return result.insertId;
    } catch (error) {
      console.error("Database insert error:", error);
      throw error;
    }
  }

  static async update(tableName, data, whereClause, whereParams = [], connection = null) {
    try {
      const db = connection || promisePool;
      const updates = Object.keys(data).map((key) => `${key} = ?`).join(", ");
      const values = [...Object.values(data).map(this._mapValue), ...whereParams.map(this._mapValue)];

      const sql = `UPDATE ${tableName} SET ${updates} WHERE ${whereClause}`;

      // console.log("Executing SQL (Update):", sql);
      const [result] = await db.execute(sql, values);
      return result.affectedRows;
    } catch (error) {
      console.error("Database update error:", error);
      throw error;
    }
  }

  static async select(tableName, columns = "*", whereClause = "", whereParams = [], orderBy = "") {
    try {
      const columnStr = Array.isArray(columns) ? columns.join(", ") : columns;
      let sql = `SELECT ${columnStr} FROM ${tableName}`;
      if (whereClause) sql += ` WHERE ${whereClause}`;
      if (orderBy) sql += ` ORDER BY ${orderBy}`;

      const safeParams = whereParams.map(this._mapValue);
      const [rows] = await promisePool.execute(sql, safeParams);
      return rows;
    } catch (error) {
      console.error("Database select error:", error);
      throw error;
    }
  }

  static async selectById(tableName, id, columns = "*") {
    return await this.select(tableName, columns, "id = ?", [id]);
  }

  static async softDelete(tableName, id) {
    return await this.update(tableName, { status: STATUS.DELETED, updatedAt: new Date() }, "id = ?", [id]);
  }

  static async hardDelete(tableName, whereClause, whereParams = [], connection = null) {
    try {
      const db = connection || promisePool;
      const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
      const safeParams = whereParams.map(this._mapValue);
      // console.log("Executing SQL (Delete):", sql);
      const [result] = await db.execute(sql, safeParams);
      return result.affectedRows;
    } catch (error) {
      console.error("Database delete error:", error);
      throw error;
    }
  }

  static async exists(tableName, whereClause, whereParams = []) {
    const sql = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
    const safeParams = whereParams.map(this._mapValue);
    const [result] = await promisePool.execute(sql, safeParams);
    return result[0].count > 0;
  }

  static async count(tableName, whereClause = "", whereParams = []) {
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    if (whereClause) sql += ` WHERE ${whereClause}`;
    const safeParams = whereParams.map(this._mapValue);
    const [result] = await promisePool.execute(sql, safeParams);
    return result[0].count;
  }

  static async selectPaginated(tableName, columns = "*", whereClause = "", whereParams = [], page = 1, limit = 10, orderBy = "id DESC") {
    try {
      const offset = (page - 1) * limit;
      const columnStr = Array.isArray(columns) ? columns.join(", ") : columns;

      const safeLimit = isNaN(parseInt(limit)) ? 10 : parseInt(limit);
      const safeOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);

      let sql = `SELECT ${columnStr} FROM ${tableName}`;
      if (whereClause) sql += ` WHERE ${whereClause}`;
      sql += ` ORDER BY ${orderBy} LIMIT ${safeLimit} OFFSET ${safeOffset}`;

      const safeParams = whereParams.map(this._mapValue);

      const [rows] = await promisePool.query(sql, safeParams);
      const total = await this.count(tableName, whereClause, whereParams);

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
    } catch (error) {
      console.error("Database paginated select error:", error);
      throw error;
    }
  }

  static async executeTransaction(callback) {
    const connection = await promisePool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async query(sql, params = [], connection = null) {
    try {
      const db = connection || promisePool;
      const safeParams = params.map(this._mapValue);
      // Use standard query instead of execute for better support of DDL (ALTER, etc.)
      const [rows] = await db.query(sql, safeParams);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async getConnection() {
    return await promisePool.getConnection();
  }
}

module.exports = DatabaseUtils;