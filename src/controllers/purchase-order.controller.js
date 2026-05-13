const PurchaseOrderModel = require("../models/purchase-order.model");

class PurchaseOrderController {
  static async list(req, res) {
    try {
      const { page, limit, searchTerm, bomId, poType } = req.body;
      const result = await PurchaseOrderModel.list(page, limit, searchTerm, bomId, poType);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error("Error listing POs:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.body;
      const result = await PurchaseOrderModel.getById(id);
      if (!result) return res.status(404).json({ success: false, message: "PO not found" });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      console.error("Error getting PO by ID:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async update(req, res) {
    try {
      const { id, ...data } = req.body;
      await PurchaseOrderModel.update(id, data);
      res.status(200).json({ success: true, message: "Purchase Order updated successfully" });
    } catch (err) {
      console.error("Error updating PO:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.body;
      await PurchaseOrderModel.delete(id);
      res.status(200).json({ success: true, message: "Purchase Order deleted successfully" });
    } catch (err) {
      console.error("Error deleting PO:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
  static async create(req, res) {
    try {
      const resultId = await PurchaseOrderModel.create(req.body);
      res.status(201).json({ success: true, data: { id: resultId } });
    } catch (err) {
      console.error("Error creating PO:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async createBatch(req, res) {
    try {
      const list = Array.isArray(req.body.list) ? req.body.list : [];
      if (list.length === 0) {
        return res.status(400).json({ success: false, message: "No PO entries provided" });
      }
      const created = await PurchaseOrderModel.createBatch({ list });
      res.status(201).json({ success: true, data: created, message: `${created.length} Purchase Order(s) created` });
    } catch (err) {
      console.error("Error creating batch POs:", err);
      res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }

  static async generateNextCode(req, res) {
    try {
      const nextCode = await PurchaseOrderModel.generateNextCode();
      res.status(200).json({ success: true, data: { nextCode } });
    } catch (err) {
      console.error("Error generating PO code:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async listBOMWise(req, res) {
    try {
      const { page, limit, searchTerm } = req.body;
      const result = await PurchaseOrderModel.listBOMWise(page, limit, searchTerm);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error("Error listing BOM-wise POs:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = PurchaseOrderController;
