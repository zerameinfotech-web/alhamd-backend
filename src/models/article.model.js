const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_article";

class ArticleModel {
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
        let whereClause = "a.status != 'Deleted'";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (a.name LIKE ? OR a.code LIKE ? OR b.name LIKE ? OR s.name LIKE ? OR EXISTS (SELECT 1 FROM tbl_item_group ig WHERE JSON_CONTAINS(COALESCE(a.itemGroup, '[]'), CAST(ig.id AS CHAR)) AND ig.name LIKE ?))";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const result = await DatabaseUtils.selectPaginated(
            `${TABLE} a 
             LEFT JOIN tbl_brand b ON a.brandId = b.id
             LEFT JOIN tbl_size sg ON a.sizeGroupId = sg.id
             LEFT JOIN tbl_colour c ON a.defaultColourId = c.id
             LEFT JOIN tbl_currency curr ON a.currencyId = curr.id
             LEFT JOIN tbl_season s ON a.seasonId = s.id`,
            `a.*, b.name as brandName, sg.sizeGroup as sizeGroupName, c.name as colourName, curr.code as currencyCode, s.name as seasonName,
             (SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM tbl_item_group WHERE JSON_CONTAINS(COALESCE(a.itemGroup, '[]'), CAST(id AS CHAR))) as itemGroupNames`,
            whereClause,
            whereParams,
            page,
            limit,
            "a.id DESC"
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
            `SELECT code FROM ${TABLE} WHERE code LIKE 'ART-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'ART-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('ART-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'ART-001';
        return 'ART-' + String(nextNum).padStart(3, '0');
    }
}
module.exports = ArticleModel;
