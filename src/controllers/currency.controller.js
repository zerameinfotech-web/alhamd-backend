const CurrencyModel = require("../models/currency.model");
const ResponseUtils = require("../utils/response.utils");

class CurrencyController {
    static async getList(req, res, next) {
        try {
            const currencies = await CurrencyModel.getActive();
            return ResponseUtils.success(res, "Currencies retrieved successfully", currencies);
        } catch (error) {
            console.error("Get currencies error:", error);
            next(error);
        }
    }
}
module.exports = CurrencyController;
