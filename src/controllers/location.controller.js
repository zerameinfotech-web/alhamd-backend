const LocationService = require("../services/location.service");
const ResponseUtils = require("../utils/response.utils");

class LocationController {
    static async getCountries(req, res, next) {
        try {
            const countries = await LocationService.getCountries();
            // Return just the array to match PHP behavior if we want strict compatibility without frontend changes?
            // But user asked to "change on the frontend also". 
            // So I will return standard response and update frontend.
            return ResponseUtils.success(res, "Countries retrieved successfully", countries);
        } catch (error) {
            console.error("Get countries error:", error);
            next(error);
        }
    }

    static async getStates(req, res, next) {
        try {
            const { countryId } = req.body;
            if (!countryId) {
                return ResponseUtils.badRequest(res, "Country ID is required");
            }
            const states = await LocationService.getStates(countryId);
            return ResponseUtils.success(res, "States retrieved successfully", states);
        } catch (error) {
            console.error("Get states error:", error);
            next(error);
        }
    }

    static async getCities(req, res, next) {
        try {
            const { stateId } = req.body;
            if (!stateId) {
                return ResponseUtils.badRequest(res, "State ID is required");
            }
            const cities = await LocationService.getCities(stateId);
            return ResponseUtils.success(res, "Cities retrieved successfully", cities);
        } catch (error) {
            console.error("Get cities error:", error);
            next(error);
        }
    }
}

module.exports = LocationController;
