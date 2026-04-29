const [[MODEL]]Model = require("../models/[[NAME]].model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await [[MODEL]]Model.create(req.body);
        const newRecord = await [[MODEL]]Model.getById(id);
        ResponseUtils.success(res, "[[TITLE]] created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        await [[MODEL]]Model.update(req.params.id, req.body);
        const updatedRecord = await [[MODEL]]Model.getById(req.params.id);
        ResponseUtils.success(res, "[[TITLE]] updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const data = await [[MODEL]]Model.getAll();
        ResponseUtils.success(res, "[[TITLE]] fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const data = await [[MODEL]]Model.getById(req.params.id);
        if (!data) return ResponseUtils.error(res, "[[TITLE]] not found", 404);
        ResponseUtils.success(res, "[[TITLE]] fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        await [[MODEL]]Model.softDelete(req.params.id);
        ResponseUtils.success(res, "[[TITLE]] deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await [[MODEL]]Model.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
