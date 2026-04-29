const SupplierTypeModel = require("../models/supplier-type.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await SupplierTypeModel.create(req.body);
        const newRecord = await SupplierTypeModel.getById(id);
        ResponseUtils.success(res, "Created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SupplierTypeModel.update(id, data);
        const updatedRecord = await SupplierTypeModel.getById(id);
        ResponseUtils.success(res, "Updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await SupplierTypeModel.getAll();
        ResponseUtils.success(res, "Fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        const data = await SupplierTypeModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Not found", 404);
        ResponseUtils.success(res, "Fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SupplierTypeModel.softDelete(id);
        ResponseUtils.success(res, "Deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
