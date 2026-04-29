const fs = require('fs');
const path = require('path');

const masters = [
    { name: "customer", table: "tbl_customer", prefix: "CUST-", title: "Customer" },
    { name: "supplier", table: "tbl_supplier", prefix: "SUPP-", title: "Supplier" },
    { name: "article", table: "tbl_article", prefix: "ART-", title: "Article" },
    { name: "item-group", table: "tbl_item_group", prefix: "IG-", title: "Item Group" },
    { name: "material", table: "tbl_material", prefix: "MAT-", title: "Material" },
    { name: "colour", table: "tbl_colour", prefix: "COL-", title: "Colour" },
    { name: "size", table: "tbl_size", prefix: "SZ-", title: "Size" },
    { name: "uom", table: "tbl_uom", prefix: "UOM-", title: "UOM" },
    { name: "warehouse", table: "tbl_warehouse", prefix: "WH-", title: "Warehouse" },
    { name: "brand", table: "tbl_brand", prefix: "BR-", title: "Brand" }
];

const basePath = path.join(__dirname, '..');

const getModelCode = (m) => [
   'const DatabaseUtils = require("../utils/database.utils");',
   'const TABLE = "' + m.table + '";',
   'class ' + m.title.replace(" ", "") + 'Model {',
   '    static async create(data) { return await DatabaseUtils.insert(TABLE, data); }',
   '    static async update(id, data) { return await DatabaseUtils.update(TABLE, data, "id = ?", [id]); }',
   '    static async getById(id) { const rows = await DatabaseUtils.query("SELECT * FROM " + TABLE + " WHERE id = ? AND status != \\'Deleted\\'", [id]); return rows[0] || null; }',
   '    static async getAll() { return await DatabaseUtils.query("SELECT * FROM " + TABLE + " WHERE status != \\'Deleted\\' ORDER BY id DESC"); }',
   '    static async softDelete(id) { return await DatabaseUtils.update(TABLE, { status: \\'Deleted\\' }, "id = ?", [id]); }',
   '    static async generateNextCode() {',
   '        const rows = await DatabaseUtils.query("SELECT code FROM " + TABLE + " WHERE code LIKE \\'' + m.prefix + '%\\' ORDER BY id DESC LIMIT 1");',
   '        if (rows.length === 0) return "' + m.prefix + '001";',
   '        const lastCode = rows[0].code;',
   '        const numPart = lastCode.replace("' + m.prefix + '", "");',
   '        const nextNum = parseInt(numPart, 10) + 1;',
   '        if (isNaN(nextNum)) return "' + m.prefix + '001";',
   '        return "' + m.prefix + '" + String(nextNum).padStart(3, "0");',
   '    }',
   '}',
   'module.exports = ' + m.title.replace(" ", "") + 'Model;'
].join("\\n");

const getControllerCode = (m) => [
    'const ' + m.title.replace(" ", "") + 'Model = require("../models/' + m.name + '.model");',
    'const ResponseUtils = require("../utils/response.utils");',
    '',
    'exports.create = async (req, res) => {',
    '    try {',
    '        const id = await ' + m.title.replace(" ", "") + 'Model.create(req.body);',
    '        const newRecord = await ' + m.title.replace(" ", "") + 'Model.getById(id);',
    '        ResponseUtils.success(res, "' + m.title + ' created successfully", newRecord, 201);',
    '    } catch (error) {',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};',
    '',
    'exports.update = async (req, res) => {',
    '    try {',
    '        await ' + m.title.replace(" ", "") + 'Model.update(req.params.id, req.body);',
    '        const updatedRecord = await ' + m.title.replace(" ", "") + 'Model.getById(req.params.id);',
    '        ResponseUtils.success(res, "' + m.title + ' updated successfully", updatedRecord);',
    '    } catch (error) {',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};',
    '',
    'exports.getAll = async (req, res) => {',
    '    try {',
    '        const data = await ' + m.title.replace(" ", "") + 'Model.getAll();',
    '        ResponseUtils.success(res, "' + m.title + ' fetched successfully", data);',
    '    } catch (error) {',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};',
    '',
    'exports.getById = async (req, res) => {',
    '    try {',
    '        const data = await ' + m.title.replace(" ", "") + 'Model.getById(req.params.id);',
    '        if (!data) return ResponseUtils.error(res, "' + m.title + ' not found", 404);',
    '        ResponseUtils.success(res, "' + m.title + ' fetched successfully", data);',
    '    } catch (error) {',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};',
    '',
    'exports.delete = async (req, res) => {',
    '    try {',
    '        await ' + m.title.replace(" ", "") + 'Model.softDelete(req.params.id);',
    '        ResponseUtils.success(res, "' + m.title + ' deleted successfully");',
    '    } catch (error) {',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};',
    '',
    'exports.generateCode = async (req, res) => {',
    '    try {',
    '        const nextCode = await ' + m.title.replace(" ", "") + 'Model.generateNextCode();',
    '        ResponseUtils.success(res, "Code generated successfully", { code: nextCode });',
    '    } catch (error) {',
    '        console.error("Code generation error:", error);',
    '        ResponseUtils.error(res, error.message, 500);',
    '    }',
    '};'
].join("\\n");

const getRoutesCode = (m) => [
    'const express = require("express");',
    'const router = express.Router();',
    'const controller = require("../controllers/' + m.name + '.controller");',
    '',
    'router.get("/generate-code", controller.generateCode);',
    'router.post("/", controller.create);',
    'router.put("/:id", controller.update);',
    'router.get("/", controller.getAll);',
    'router.get("/:id", controller.getById);',
    'router.delete("/:id", controller.delete);',
    '',
    'module.exports = router;'
].join("\\n");

masters.forEach(m => {
    const modelPath = path.join(basePath, 'models', m.name + '.model.js');
    const controllerPath = path.join(basePath, 'controllers', m.name + '.controller.js');
    const routesPath = path.join(basePath, 'routes', m.name + '.routes.js');

    fs.writeFileSync(modelPath, getModelCode(m));
    fs.writeFileSync(controllerPath, getControllerCode(m));
    fs.writeFileSync(routesPath, getRoutesCode(m));
    
    console.log("Generated files for " + m.title);
});

console.log("All master files generated.");
