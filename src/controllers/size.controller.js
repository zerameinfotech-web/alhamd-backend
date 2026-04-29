const SizeModel = require("../models/size.model");
const ResponseUtils = require("../utils/response.utils");
const DatabaseUtils = require("../utils/database.utils");

exports.create = async (req, res) => {
    try {
        console.log("Size Group create request body:", JSON.stringify(req.body));
        let body = req.body;

        if (body && !Array.isArray(body) && body.data && Array.isArray(body.data)) {
            body = body.data;
        }

        const isBulk = Array.isArray(body);
        const groupData = isBulk ? body[0] : body;
        const { sizes, ...masterData } = groupData;

        const result = await DatabaseUtils.executeTransaction(async (connection) => {
            const groupId = await SizeModel.createGroup({ ...masterData, created_at: new Date() }, connection);
            
            const sizeList = sizes || (isBulk ? body : []);
            if (sizeList.length > 0) {
                await SizeModel.addDetails(groupId, sizeList, connection);
            }
            return groupId;
        });

        const newRecord = await SizeModel.getGroupById(result);
        ResponseUtils.success(res, "Size group created successfully", newRecord, 201);
    } catch (error) {
        console.error("Size create error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, sizes, ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);

        await DatabaseUtils.executeTransaction(async (connection) => {
            await SizeModel.updateGroup(id, { ...data, updated_at: new Date() }, connection);

            if (sizes && Array.isArray(sizes)) {
                await SizeModel.deleteDetailsByGroupId(id, connection);
                await SizeModel.addDetails(id, sizes, connection);
            }
        });

        const updatedRecord = await SizeModel.getGroupById(id);
        ResponseUtils.success(res, "Size group updated successfully", updatedRecord);
    } catch (error) {
        console.error("Size update error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", searchTerm = "" } = req.body;
        const result = await SizeModel.listGroups(
            parseInt(page),
            parseInt(limit),
            search || searchTerm
        );
        return res.status(200).json({
            success: true,
            message: "Size groups fetched successfully",
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
        const data = await SizeModel.getGroupById(id);
        if (!data) return ResponseUtils.error(res, "Size group not found", 404);
        ResponseUtils.success(res, "Size group fetched successfully", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await SizeModel.softDeleteGroup(id);
        ResponseUtils.success(res, "Size group deleted successfully");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.generateCode = async (req, res) => {
    try {
        const nextCode = await SizeModel.generateNextCode();
        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });
    } catch (error) {
        console.error("Code generation error:", error);
        ResponseUtils.error(res, error.message, 500);
    }
};
