const DatabaseUtils = require("../utils/database.utils");

const TABLE = "[[TABLE]]";

class [[MODEL]]Model {
    static async create(data) {
        return await DatabaseUtils.insert(TABLE, data);
    }
    static async update(id, data) {
        return await DatabaseUtils.update(TABLE, data, "id = ?", [id]);
    }
    static async getById(id) {
        const rows = await DatabaseUtils.query(`SELECT * FROM ${TABLE} WHERE id = ? AND status != 'Deleted'`, [id]);
        return rows[0] || null;
    }
    static async getAll() {
        return await DatabaseUtils.query(`SELECT * FROM ${TABLE} WHERE status != 'Deleted' ORDER BY id DESC`);
    }
    static async softDelete(id) {
        return await DatabaseUtils.update(TABLE, { status: 'Deleted' }, "id = ?", [id]);
    }
    static async generateNextCode() {
        const rows = await DatabaseUtils.query(
            `SELECT code FROM ${TABLE} WHERE code LIKE '[[PREFIX]]%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return '[[PREFIX]]001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('[[PREFIX]]', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return '[[PREFIX]]001';
        return '[[PREFIX]]' + String(nextNum).padStart(3, '0');
    }
}
module.exports = [[MODEL]]Model;
