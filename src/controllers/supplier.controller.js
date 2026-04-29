const SupplierModel = require("../models/supplier.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (Array.isArray(payload.supplierType)) payload.supplierType = JSON.stringify(payload.supplierType);
        if (Array.isArray(payload.categoriesSupplied)) payload.categoriesSupplied = JSON.stringify(payload.categoriesSupplied);
        
        const id = await SupplierModel.create(payload);
        const newRecord = await SupplierModel.getById(id);
        ResponseUtils.success(res, "Supplier created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...payload } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        
        if (Array.isArray(payload.supplierType)) payload.supplierType = JSON.stringify(payload.supplierType);
        if (Array.isArray(payload.categoriesSupplied)) payload.categoriesSupplied = JSON.stringify(payload.categoriesSupplied);

        await SupplierModel.update(id, payload);
        const updatedRecord = await SupplierModel.getById(id);
        ResponseUtils.success(res, "Supplier updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await SupplierModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        
        const mappedList = result.list.map(d => {
            if (typeof d.supplierType === 'string') {
                try { d.supplierType = JSON.parse(d.supplierType); } catch(e) { d.supplierType = []; }
            } else if (!d.supplierType) d.supplierType = [];
            
            if (typeof d.categoriesSupplied === 'string') {
                try { d.categoriesSupplied = JSON.parse(d.categoriesSupplied); } catch(e) { d.categoriesSupplied = []; }
            } else if (!d.categoriesSupplied) d.categoriesSupplied = [];
            
            return d;
        });

        return res.status(200).json({
            success: true,
            message: "Supplier fetched successfully",
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
        let data = await SupplierModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Supplier not found", 404);
        
        if (typeof data.supplierType === 'string') {
            try { data.supplierType = JSON.parse(data.supplierType); } catch(e) { data.supplierType = []; }
        } else if (!data.supplierType) data.supplierType = [];
        
        if (typeof data.categoriesSupplied === 'string') {
            try { data.categoriesSupplied = JSON.parse(data.categoriesSupplied); } catch(e) { data.categoriesSupplied = []; }
        } else if (!data.categoriesSupplied) data.categoriesSupplied = [];
        
        ResponseUtils.success(res, "Supplier fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SupplierModel.softDelete(id);
        ResponseUtils.success(res, "Supplier deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await SupplierModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
