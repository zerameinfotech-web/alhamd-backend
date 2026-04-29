const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_item_group";

class ItemGroupModel {
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
    static async list(page = 1, limit = 10, searchTerm = "") {
        let whereClause = "status != 'Deleted'";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (name LIKE ? OR code LIKE ?)";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern);
        }

        const result = await DatabaseUtils.selectPaginated(
            TABLE,
            "*",
            whereClause,
            whereParams,
            page,
            limit,
            "id DESC"
        );

        return {
            list: result.data,
            totalCount: result.pagination.total
        };
    }
    static async softDelete(id) {
        return await DatabaseUtils.update(TABLE, { status: 'Deleted' }, "id = ?", [id]);
    }
    static async generateNextCode() {
        const rows = await DatabaseUtils.query(
            `SELECT code FROM ${TABLE} WHERE code LIKE 'MG-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'MG-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('MG-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'MG-001';
        return 'MG-' + String(nextNum).padStart(3, '0');
    }
}
module.exports = ItemGroupModel;
