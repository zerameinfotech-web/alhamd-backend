const UOMModel = require("../models/uom.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await UOMModel.create(req.body);
        const newRecord = await UOMModel.getById(id);
        ResponseUtils.success(res, "UOM created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await UOMModel.update(id, data);
        const updatedRecord = await UOMModel.getById(id);
        ResponseUtils.success(res, "UOM updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await UOMModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        return res.status(200).json({
            success: true,
            message: "UOM fetched successfully",
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        const data = await UOMModel.getById(id);
        if (!data) return ResponseUtils.error(res, "UOM not found", 404);
        ResponseUtils.success(res, "UOM fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await UOMModel.softDelete(id);
        ResponseUtils.success(res, "UOM deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
