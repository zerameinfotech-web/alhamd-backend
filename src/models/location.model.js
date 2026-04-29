const DatabaseUtils = require("../utils/database.utils");
const { TABLES } = require("../config/constants");

class LocationModel {
    static async getCountries() {
        const sql = `SELECT id as value, countryName as label FROM ${TABLES.COUNTRY_DETAILS}`;
        return await DatabaseUtils.query(sql);
    }

    static async getStates(countryId) {
        const sql = `SELECT id as value, stateName as label FROM ${TABLES.STATE_DETAILS} WHERE countryId = ?`;
        return await DatabaseUtils.query(sql, [countryId]);
    }

    static async getCities(stateId) {
        const sql = `SELECT id as value, cityName as label FROM ${TABLES.CITY_DETAILS} WHERE stateId = ?`;
        return await DatabaseUtils.query(sql, [stateId]);
    }
}

module.exports = LocationModel;
