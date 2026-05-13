const ItemGroupModel = require("../models/item-group.model");
const ResponseUtils = require("../utils/response.utils");

exports.create = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (Array.isArray(payload.materials)) {
            payload.materials = JSON.stringify(payload.materials);
        }
        const id = await ItemGroupModel.create(payload);
        const newRecord = await ItemGroupModel.getById(id);
        ResponseUtils.success(res, "Item Group created successfully", newRecord, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);

        if (Array.isArray(data.materials)) {
            data.materials = JSON.stringify(data.materials);
        }

        await ItemGroupModel.update(id, data);
        const updatedRecord = await ItemGroupModel.getById(id);
        ResponseUtils.success(res, "Item Group updated successfully", updatedRecord);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await ItemGroupModel.list(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );

        const mappedList = result.list.map(d => {
            if (typeof d.materials === 'string') {
                try { d.materials = JSON.parse(d.materials); } catch (e) { d.materials = []; }
            } else if (!d.materials) {
                d.materials = [];
            }
            return d;
        });

        return res.status(200).json({
            success: true,
            message: "Item Group fetched successfully",
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
        let data = await ItemGroupModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Item Group not found", 404);

        if (typeof data.materials === 'string') {
            try { data.materials = JSON.parse(data.materials); } catch (e) { data.materials = []; }
        } else if (!data.materials) {
            data.materials = [];
        }

        ResponseUtils.success(res, "Item Group fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await ItemGroupModel.softDelete(id);
        ResponseUtils.success(res, "Item Group deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getDropdown = async (req, res) => {
    try {
        const DatabaseUtils = require("../utils/database.utils");
        const groups = await DatabaseUtils.query(
            `SELECT id, code, name FROM tbl_item_group WHERE status != 'Deleted' ORDER BY name ASC`
        );
        const materials = await DatabaseUtils.query(
            `SELECT m.id AS materialId, m.code AS materialCode, m.name AS materialName,
                    m.itemGroupId, m.uomId, u.name AS uomName,
                    m.colourId, COALESCE(c.name, m.colour) AS colourName,
                    m.gstSlab, m.price
             FROM tbl_material m
             LEFT JOIN tbl_uom u ON m.uomId = u.id
             LEFT JOIN tbl_colour c ON m.colourId = c.id
             WHERE m.status != 'Deleted' AND m.itemGroupId IS NOT NULL`
        );
        const byGroup = new Map();
        materials.forEach(m => {
            const slabNum = Number(m.gstSlab || 0);
            const mapped = {
                materialId: m.materialId,
                materialCode: m.materialCode,
                materialName: m.materialName,
                itemGroupId: m.itemGroupId,
                uomId: m.uomId,
                uomName: m.uomName,
                colourId: m.colourId,
                colourName: m.colourName,
                gstSlab: `${slabNum}%`,
                purchasePrice: Number(m.price || 0),
            };
            const arr = byGroup.get(m.itemGroupId) || [];
            arr.push(mapped);
            byGroup.set(m.itemGroupId, arr);
        });
        const list = groups.map(g => ({
            ...g,
            materials: byGroup.get(g.id) || []
        }));
        ResponseUtils.success(res, "Item Group dropdown fetched", list);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await ItemGroupModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
