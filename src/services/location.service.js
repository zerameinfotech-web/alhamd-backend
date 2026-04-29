const LocationModel = require("../models/location.model");

class LocationService {
    static async getCountries() {
        return await LocationModel.getCountries();
    }

    static async getStates(countryId) {
        return await LocationModel.getStates(countryId);
    }

    static async getCities(stateId) {
        return await LocationModel.getCities(stateId);
    }
}

module.exports = LocationService;
