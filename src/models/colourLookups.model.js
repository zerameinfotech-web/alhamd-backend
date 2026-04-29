const DatabaseUtils = require("../utils/database.utils");
const { TABLES } = require("../config/constants");

class ColourLookupsModel {
    static async getCategories() {
        return await DatabaseUtils.query(`SELECT id, name FROM ${TABLES.COLOUR_CATEGORY} WHERE status = 'Active'`);
    }
    static async getFinishTypes() {
        return await DatabaseUtils.query(`SELECT id, name FROM ${TABLES.FINISH_TYPE} WHERE status = 'Active'`);
    }
    static async getColourGroups() {
        return await DatabaseUtils.query(`SELECT id, name FROM ${TABLES.COLOUR_GROUP} WHERE status = 'Active'`);
    }
}
module.exports = ColourLookupsModel;
