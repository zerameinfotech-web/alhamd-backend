const BOM = require("../models/bom.model");

const bomController = {
  generateCode: async (req, res) => {
    try {
      const code = await BOM.generateCode();
      res.status(200).json({ success: true, code });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const result = await BOM.create(req.body);
      res.status(201).json({ success: true, data: result, message: "BOM saved successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id, ...bomData } = req.body;
      const result = await BOM.update(id, bomData);
      res.status(200).json({ success: true, data: result, message: "BOM updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAll: async (req, res) => {
    try {
      const result = await BOM.getAll(req.body);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const result = await BOM.getById(req.body.id);
      if (!result) {
        return res.status(404).json({ success: false, message: "BOM not found" });
      }
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const success = await BOM.delete(req.body.id);
      if (!success) {
        return res.status(404).json({ success: false, message: "BOM not found" });
      }
      res.status(200).json({ success: true, message: "BOM deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateLegacyCodes: async (req, res) => {
    try {
      const DatabaseUtils = require("../utils/database.utils");
      const boms = await DatabaseUtils.query("SELECT id, bomCode FROM tbl_bom ORDER BY id ASC");
      let counter = 1;
      let count = 0;
      for (const bom of boms) {
          const newCode = `BOM-${String(counter).padStart(4, '0')}`;
          await DatabaseUtils.update("tbl_bom", { bomCode: newCode }, "id = ?", [bom.id]);
          counter++;
          count++;
      }
      res.status(200).json({ success: true, message: `Updated ${count} legacy BOMs.` });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = bomController;
