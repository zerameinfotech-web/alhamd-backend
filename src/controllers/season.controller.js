const SeasonModel = require("../models/season.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await SeasonModel.create(req.body);
        const newRecord = await SeasonModel.getById(id);
        ResponseUtils.success(res, "Season created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SeasonModel.update(id, data);
        const updatedRecord = await SeasonModel.getById(id);
        ResponseUtils.success(res, "Season updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await SeasonModel.getAll();
        ResponseUtils.success(res, "Seasons fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SeasonModel.softDelete(id);
        ResponseUtils.success(res, "Season deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
