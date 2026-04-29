const OrderModel = require("../models/order.model");
const ResponseUtils = require("../utils/response.utils");
const DatabaseUtils = require("../utils/database.utils");

exports.generateCode = async (req, res) => {
    try {
        const code = await OrderModel.generateNextCode();
        ResponseUtils.success(res, "Code generated", { code });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.create = async (req, res) => {
    try {
        console.dir(req.body, { depth: null });
        const { items = [], ...data } = req.body;
        const id = await OrderModel.create(data, items);
        const record = await OrderModel.getById(id);
        ResponseUtils.success(res, "Order created", record, 201);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.update = async (req, res) => {
    try {
        const { id, items = [], ...data } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await OrderModel.update(id, data, items);
        const record = await OrderModel.getById(id);
        ResponseUtils.success(res, "Order updated", record);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.body;
        const result = await OrderModel.list(parseInt(page), parseInt(limit), search);
        return res.status(200).json({
            success: true,
            message: "Orders fetched",
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getDropdown = async (req, res) => {
    try {
        const { search = "" } = req.body || {};
        const list = await OrderModel.listForDropdown(search);
        ResponseUtils.success(res, "Order dropdown fetched", list);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.body;
        const data = await OrderModel.getById(id);
        if (!data) return ResponseUtils.error(res, "Order not found", 404);
        ResponseUtils.success(res, "Order fetched", data);
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return ResponseUtils.error(res, "ID is required", 400);
        await OrderModel.softDelete(id);
        ResponseUtils.success(res, "Order deleted");
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

// Returns sizes for a specific article's sizeGroup and sizeType
exports.getArticleSizes = async (req, res) => {
    try {
        const { sizeGroup } = req.body;
        if (!sizeGroup) return ResponseUtils.success(res, "No sizeGroup", { sizeType: '', list: [] });
        
        const query = `
            SELECT d.name, d.name as value, g.sizeType
            FROM tbl_size_details d
            JOIN tbl_size g ON d.groupId = g.id
            WHERE g.status != 'Deleted' AND g.deleted_at IS NULL AND d.deleted_at IS NULL AND (g.id = ? OR g.sizeGroup = ?)
            ORDER BY CAST(d.name AS UNSIGNED) ASC, d.name ASC
        `;
        const result = await DatabaseUtils.query(query, [sizeGroup, String(sizeGroup)]);
        
        const fs = require('fs');
        fs.appendFileSync('debug_log.txt', JSON.stringify({
            time: new Date().toISOString(),
            sizeGroupFromReq: sizeGroup,
            resultCount: result.length
        }) + '\n');

        const sizeType = result.length > 0 ? result[0].sizeType : '';
        
        ResponseUtils.success(res, "Sizes fetched", { 
            sizeType, 
            list: result.map(r => ({ name: r.name, value: r.value })) 
        });
    } catch (error) {
        ResponseUtils.error(res, error.message, 500);
    }
};

exports.testDb = async (req, res) => {
    try {
        const sizes = await DatabaseUtils.query('SELECT * FROM tbl_size LIMIT 5');
        const details = await DatabaseUtils.query('SELECT * FROM tbl_size_details LIMIT 20');
        const articles = await DatabaseUtils.query('SELECT id, sizeGroupId, sizeGroup FROM tbl_article ORDER BY id DESC LIMIT 5');
        res.json({ sizes, details, articles });
    } catch (e) {
        res.json({ error: e.message });
    }
};
