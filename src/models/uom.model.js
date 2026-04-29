const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_uom";

class UOMModel {
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
            whereClause += " AND (name LIKE ? OR description LIKE ?)";
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
}
module.exports = UOMModel;
