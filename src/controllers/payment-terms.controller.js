const PaymentTermsModel = require("../models/payment-terms.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await PaymentTermsModel.create(req.body);
        const newRecord = await PaymentTermsModel.getById(id);
        ResponseUtils.success(res, "Created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await PaymentTermsModel.update(id, data);
        const updatedRecord = await PaymentTermsModel.getById(id);
        ResponseUtils.success(res, "Updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await PaymentTermsModel.getAll();
        ResponseUtils.success(res, "Fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        const data = await PaymentTermsModel.getById(id);
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
        await PaymentTermsModel.softDelete(id);
        ResponseUtils.success(res, "Deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
