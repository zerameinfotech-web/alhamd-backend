const DatabaseUtils = require("../utils/database.utils");
const { TABLES } = require("../config/constants");

class SizeLookupsModel {
    static async getSizeTypes() {
        return await DatabaseUtils.query(`SELECT id, name FROM ${TABLES.SIZE_TYPE} WHERE status = 'Active'`);
    }
    static async getGenders() {
        return await DatabaseUtils.query(`SELECT id, name FROM ${TABLES.SIZE_GENDER} WHERE status = 'Active'`);
    }
    static async getSizeGroups() {
        return await DatabaseUtils.query(`SELECT id, sizeGroup as name FROM tbl_size WHERE status != 'Deleted' AND deleted_at IS NULL`);
    }
}
module.exports = SizeLookupsModel;
