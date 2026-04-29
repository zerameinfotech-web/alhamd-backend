const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_material";

class MaterialModel {
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
        let whereClause = "m.status != 'Deleted'";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (m.name LIKE ? OR m.code LIKE ? OR u.name LIKE ? OR c.name LIKE ? OR ig.name LIKE ?)";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const result = await DatabaseUtils.selectPaginated(
            `${TABLE} m
             LEFT JOIN tbl_item_group ig ON m.itemGroupId = ig.id
             LEFT JOIN tbl_uom u ON m.uomId = u.id
             LEFT JOIN tbl_colour c ON m.colourId = c.id`,
            "m.*, ig.name as itemGroupName, u.name as uomName, COALESCE(c.name, m.colour) as colourName",
            whereClause,
            whereParams,
            page,
            limit,
            "m.id DESC"
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
            `SELECT code FROM ${TABLE} WHERE code LIKE 'MAT-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'MAT-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('MAT-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'MAT-001';
        return 'MAT-' + String(nextNum).padStart(3, '0');
    }
}
module.exports = MaterialModel;
