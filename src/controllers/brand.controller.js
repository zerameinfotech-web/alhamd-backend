const BrandModel = require("../models/brand.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (Array.isArray(payload.accessoryIds)) {
            payload.accessoryIds = JSON.stringify(payload.accessoryIds);
        }
        const id = await BrandModel.create(payload);
        const newRecord = await BrandModel.getById(id);
        ResponseUtils.success(res, "Brand created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        
        if (Array.isArray(data.accessoryIds)) {
            data.accessoryIds = JSON.stringify(data.accessoryIds);
        }

        await BrandModel.update(id, data);
        const updatedRecord = await BrandModel.getById(id);
        ResponseUtils.success(res, "Brand updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await BrandModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        
        const mappedList = result.list.map(d => {
            if (typeof d.accessoryIds === 'string') {
                try { d.accessoryIds = JSON.parse(d.accessoryIds); } catch(e) { d.accessoryIds = []; }
            } else if (!d.accessoryIds) {
                d.accessoryIds = [];
            }
            return d;
        });

        return res.status(200).json({
            success: true,
            message: "Brand fetched successfully",
            timestamp: new Date().toISOString(),
            list: mappedList,
            totalCount: result.totalCount
        });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        let data = await BrandModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Brand not found", 404);
        
        if (typeof data.accessoryIds === 'string') {
            try { data.accessoryIds = JSON.parse(data.accessoryIds); } catch(e) { data.accessoryIds = []; }
        } else if (!data.accessoryIds) {
            data.accessoryIds = [];
        }
        
        ResponseUtils.success(res, "Brand fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await BrandModel.softDelete(id);
        ResponseUtils.success(res, "Brand deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};
