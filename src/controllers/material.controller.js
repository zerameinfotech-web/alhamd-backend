const MaterialModel = require("../models/material.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const id = await MaterialModel.create(req.body);
        const newRecord = await MaterialModel.getById(id);
        ResponseUtils.success(res, "Material created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await MaterialModel.update(id, data);
        const updatedRecord = await MaterialModel.getById(id);
        ResponseUtils.success(res, "Material updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await MaterialModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        return res.status(200).json({
            success: true,
            message: "Material fetched successfully",
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
        const data = await MaterialModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Material not found", 404);
        ResponseUtils.success(res, "Material fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await MaterialModel.softDelete(id);
        ResponseUtils.success(res, "Material deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await MaterialModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
