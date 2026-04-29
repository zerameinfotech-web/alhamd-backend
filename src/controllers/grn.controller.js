const GRNModel = require("../models/grn.model");

class GRNController {
  static async generateCode(req, res) {
    try {
      const nextCode = await GRNModel.generateNextCode();
      res.json({ success: true, data: { nextCode } });
    } catch (err) {
      console.error("Error generating GRN code:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async list(req, res) {
    try {
      const { page, limit, searchTerm, bomId, type } = req.body;
      const result = await GRNModel.list(page, limit, searchTerm, bomId, type);
      res.status(200).json({ success: true, list: result.list, totalCount: result.totalCount });
    } catch (err) {
      console.error("Error listing GRNs:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async listBOMWise(req, res) {
    try {
      const { page, limit, searchTerm, type } = req.body;
      const result = await GRNModel.listBOMWise(page, limit, searchTerm, type);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error("Error listing BOM-wise GRNs:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async create(req, res) {
    try {
      const resultId = await GRNModel.create(req.body);
      res.status(201).json({ success: true, data: { id: resultId }, message: "GRN saved successfully" });
    } catch (err) {
      console.error("Error creating GRN:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.body;
      await GRNModel.delete(id);
      res.status(200).json({ success: true, message: "GRN deleted successfully" });
    } catch (err) {
      console.error("Error deleting GRN:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async getPoTotals(req, res) {
    try {
      const { poNo } = req.body;
      const totals = await GRNModel.getPoTotals(poNo);
      res.json({ success: true, data: totals });
    } catch (err) {
      console.error("Error getting PO totals:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const grn = await GRNModel.getById(id);
      if (!grn) {
        return res.status(404).json({ success: false, message: "GRN not found" });
      }
      res.status(200).json({ success: true, items: grn.items, data: grn });
    } catch (err) {
      console.error("Error fetching GRN by ID:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = GRNController;
