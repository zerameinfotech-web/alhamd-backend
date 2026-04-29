const DatabaseUtils = require("../utils/database.utils");

const MASTER_TABLE = "tbl_size";
const DETAILS_TABLE = "tbl_size_details";

class SizeModel {
    static async createGroup(data, connection = null) {
        return await DatabaseUtils.insert(MASTER_TABLE, data, connection);
    }

    static async updateGroup(id, data, connection = null) {
        return await DatabaseUtils.update(MASTER_TABLE, data, "id = ?", [id], connection);
    }

    static async getGroupById(id) {
        const rows = await DatabaseUtils.query(`SELECT * FROM ${MASTER_TABLE} WHERE id = ? AND (status != 'Deleted' AND deleted_at IS NULL)`, [id]);
        return rows[0] || null;
    }

    static async listGroups(page = 1, limit = 10, searchTerm = "") {
        const offset = (page - 1) * limit;
        let whereClause = "WHERE (g.status != 'Deleted' AND g.deleted_at IS NULL)";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (g.code LIKE ? OR g.sizeGroup LIKE ? OR g.sizeType LIKE ? OR g.gender LIKE ?)";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const query = `
            SELECT g.*, 
                   GROUP_CONCAT(d.name ORDER BY d.id ASC SEPARATOR ', ') as individualSizes,
                   st.name as sizeTypeName,
                   gen.name as genderName
            FROM ${MASTER_TABLE} g
            LEFT JOIN ${DETAILS_TABLE} d ON g.id = d.groupId AND d.deleted_at IS NULL
            LEFT JOIN tbl_size_type st ON g.sizeTypeId = st.id
            LEFT JOIN tbl_size_gender gen ON g.genderId = gen.id
            ${whereClause}
            GROUP BY g.id
            ORDER BY g.id DESC
            LIMIT ? OFFSET ?
        `;

        const countQuery = `SELECT COUNT(*) as total FROM ${MASTER_TABLE} g ${whereClause}`;

        const rows = await DatabaseUtils.query(query, [...whereParams, limit, offset]);
        const counts = await DatabaseUtils.query(countQuery, whereParams);
        const total = counts[0]?.total || 0;

        return {
            list: rows,
            totalCount: total
        };
    }

    static async softDeleteGroup(id) {
        return await DatabaseUtils.update(MASTER_TABLE, { status: 'Deleted', deleted_at: new Date() }, "id = ?", [id]);
    }

    static async addDetails(groupId, sizes, connection = null) {
        for (const size of sizes) {
            await DatabaseUtils.insert(DETAILS_TABLE, { groupId, name: typeof size === 'string' ? size : size.name }, connection);
        }
    }

    static async deleteDetailsByGroupId(groupId, connection = null) {
        // Use soft delete for details as well for consistency
        return await DatabaseUtils.update(DETAILS_TABLE, { deleted_at: new Date() }, "groupId = ?", [groupId], connection);
    }

    static async generateNextCode() {
        const rows = await DatabaseUtils.query(
            `SELECT code FROM ${MASTER_TABLE} WHERE code LIKE 'SZ-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'SZ-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('SZ-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'SZ-001';
        return 'SZ-' + String(nextNum).padStart(3, '0');
    }
}

module.exports = SizeModel;
