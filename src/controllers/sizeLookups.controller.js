const SizeLookupsModel = require("../models/sizeLookups.model");
const ResponseUtils = require("../utils/response.utils");

exports.getSizeTypes = async (req, res) => {
    try {
        const data = await SizeLookupsModel.getSizeTypes();
        ResponseUtils.success(res, "Size Types fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getGenders = async (req, res) => {
    try {
        const data = await SizeLookupsModel.getGenders();
        ResponseUtils.success(res, "Genders fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getSizeGroups = async (req, res) => {
    try {
        const data = await SizeLookupsModel.getSizeGroups();
        ResponseUtils.success(res, "Size Groups fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
