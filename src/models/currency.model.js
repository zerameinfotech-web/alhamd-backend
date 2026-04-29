const DatabaseUtils = require("../utils/database.utils");
const { TABLES } = require("../config/constants");

class CurrencyModel {
    static async getActive() {
        const sql = `SELECT id as value, CONCAT(name, ' (', symbol, ')') as label, code FROM ${TABLES.CURRENCY} WHERE status = 'Active'`;
        return await DatabaseUtils.query(sql);
    }
}
module.exports = CurrencyModel;
