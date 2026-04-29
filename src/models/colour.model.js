const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_colour";

class ColourModel {
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
        let whereClause = "c.status != 'Deleted'";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (c.name LIKE ? OR c.code LIKE ? OR cat.name LIKE ?)";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern);
        }

        const result = await DatabaseUtils.selectPaginated(
            `${TABLE} c 
             LEFT JOIN tbl_colour_category cat ON c.categoryId = cat.id
             LEFT JOIN tbl_finish_type f ON c.finishTypeId = f.id
             LEFT JOIN tbl_colour_group g ON c.colourGroupId = g.id`,
            "c.*, cat.name as categoryName, f.name as finishName, g.name as groupName",
            whereClause,
            whereParams,
            page,
            limit,
            "c.id DESC"
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
            `SELECT code FROM ${TABLE} WHERE code LIKE 'COL-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'COL-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('COL-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'COL-001';
        return 'COL-' + String(nextNum).padStart(3, '0');
    }
}
module.exports = ColourModel;
