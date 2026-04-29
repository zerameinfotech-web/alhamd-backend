const ColourLookupsModel = require("../models/colourLookups.model");
const ResponseUtils = require("../utils/response.utils");

exports.getCategories = async (req, res) => {
    try {
        const data = await ColourLookupsModel.getCategories();
        ResponseUtils.success(res, "Categories fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getFinishTypes = async (req, res) => {
    try {
        const data = await ColourLookupsModel.getFinishTypes();
        ResponseUtils.success(res, "Finish Types fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getColourGroups = async (req, res) => {
    try {
        const data = await ColourLookupsModel.getColourGroups();
        ResponseUtils.success(res, "Colour Groups fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
