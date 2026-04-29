const CustomerModel = require("../models/customer.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await CustomerModel.create(req.body);
        const newRecord = await CustomerModel.getById(id);
        ResponseUtils.success(res, "Customer created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await CustomerModel.update(id, data);
        const updatedRecord = await CustomerModel.getById(id);
        ResponseUtils.success(res, "Customer updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await CustomerModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        return res.status(200).json({
            success: true,
            message: "Customer fetched successfully",
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
        const data = await CustomerModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Customer not found", 404);
        ResponseUtils.success(res, "Customer fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await CustomerModel.softDelete(id);
        ResponseUtils.success(res, "Customer deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await CustomerModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
