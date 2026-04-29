const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_supplier";

class SupplierModel {
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
        let whereClause = "s.status != 'Deleted'";
        let whereParams = [];

        if (searchTerm) {
            whereClause += " AND (s.name LIKE ? OR s.code LIKE ? OR s.contactPerson LIKE ? OR s.email LIKE ?)";
            const searchPattern = `%${searchTerm}%`;
            whereParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        const result = await DatabaseUtils.selectPaginated(
            `${TABLE} s 
             LEFT JOIN tbl_countrydetails co ON s.countryId = co.id
             LEFT JOIN tbl_currency curr ON s.currencyId = curr.id
             LEFT JOIN tbl_payment_terms pt ON s.paymentTermsId = pt.id`,
            `s.*, 
             co.countryName as countryName, 
             curr.code as currencyCode, 
             pt.name as paymentTermsName,
             (SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM tbl_supplier_type WHERE JSON_CONTAINS(COALESCE(s.supplierType, '[]'), CAST(id AS CHAR)) OR JSON_CONTAINS(COALESCE(s.supplierType, '[]'), JSON_QUOTE(name))) as typeNames,
             (SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM tbl_item_group WHERE JSON_CONTAINS(COALESCE(s.categoriesSupplied, '[]'), CAST(id AS CHAR)) OR JSON_CONTAINS(COALESCE(s.categoriesSupplied, '[]'), JSON_QUOTE(name))) as categoriesNames`,
            whereClause,
            whereParams,
            page,
            limit,
            "s.id DESC"
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
            `SELECT code FROM ${TABLE} WHERE code LIKE 'SUPP-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'SUPP-001';
        const lastCode = rows[0].code;
        const numPart = lastCode.replace('SUPP-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'SUPP-001';
        return 'SUPP-' + String(nextNum).padStart(3, '0');
    }
}
module.exports = SupplierModel;
