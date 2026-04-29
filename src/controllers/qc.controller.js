const QCModel = require("../models/qc.model");

class QCController {
  static async list(req, res) {
    try {
      const { page, limit, searchTerm, type, bomId } = req.body;
      const data = await QCModel.list(
        parseInt(page) || 1,
        parseInt(limit) || 10,
        searchTerm || "",
        type || "accepted",
        bomId
      );
      res.json({ success: true, ...data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async listBOMWise(req, res) {
    try {
      const { page, limit, searchTerm, type } = req.body;
      const data = await QCModel.listBOMWise(
        parseInt(page) || 1,
        parseInt(limit) || 10,
        searchTerm || "",
        type || "accepted"
      );
      res.json({ success: true, ...data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async getById(req, res) {
    try {
      const data = await QCModel.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: "QC record not found" });
      res.json({ success: true, qc: data });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async generateNextCode(req, res) {
    try {
      const code = await QCModel.generateNextCode();
      res.json({ success: true, code });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async create(req, res) {
    try {
      const id = await QCModel.create(req.body);
      res.json({ success: true, id, message: "QC Record created successfully and stock updated" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: "ID is required for update" });
      await QCModel.update(id, req.body);
      res.json({ success: true, message: "QC Record updated successfully" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: "ID is required" });
      await QCModel.delete(id);
      res.json({ success: true, message: "QC Record deleted and stock reversed successfully" });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

module.exports = QCController;
