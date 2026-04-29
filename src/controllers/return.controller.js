const ReturnModel = require('../models/return.model');

class ReturnController {
  static async list(req, res) {
    try {
      const result = await ReturnModel.list(req.body);
      res.json({ success: true, ...result });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async create(req, res) {
    try {
      const id = await ReturnModel.create(req.body);
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async generateCode(req, res) {
    try {
      const code = await ReturnModel.generateCode();
      res.json({ success: true, code });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  static async delete(req, res) {
    try {
      await ReturnModel.delete(req.body.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

module.exports = ReturnController;
