const WarehouseModel = require("../models/warehouse.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await WarehouseModel.create(req.body);
        const newRecord = await WarehouseModel.getById(id);
        ResponseUtils.success(res, "Warehouse created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await WarehouseModel.update(id, data);
        const updatedRecord = await WarehouseModel.getById(id);
        ResponseUtils.success(res, "Warehouse updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await WarehouseModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        return res.status(200).json({
            success: true,
            message: "Warehouse fetched successfully",
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
        const data = await WarehouseModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Warehouse not found", 404);
        ResponseUtils.success(res, "Warehouse fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await WarehouseModel.softDelete(id);
        ResponseUtils.success(res, "Warehouse deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await WarehouseModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
