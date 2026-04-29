const express = require("express");
const router = express.Router();
const InventoryModel = require("../models/inventory.model");

router.post("/list", async (req, res) => {
  try {
    const { page, limit, searchTerm, mode, orderId } = req.body;
    const result = await InventoryModel.list(page, limit, searchTerm, mode, orderId);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const { materialId, uomId, color, orderId, quantity, warehouseId } = req.body;
    if (!materialId || !uomId || !orderId || quantity === undefined || !warehouseId) {
      return res.status(400).json({ success: false, message: "Missing required fields for transfer" });
    }
    await InventoryModel.transferToWarehouse(materialId, uomId, color, orderId, quantity, warehouseId);
    res.json({ success: true, message: "Stock transferred to warehouse successfully" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/history", async (req, res) => {
  try {
    const { materialId, uomId, color, orderId, stockStatus } = req.body;
    const history = await InventoryModel.getHistory(materialId, uomId, color, orderId, stockStatus);
    res.json({ success: true, data: history });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/warehouse-breakdown", async (req, res) => {
  try {
    const { materialId, uomId, color } = req.body;
    const breakdown = await InventoryModel.getWarehouseBreakdown(materialId, uomId, color);
    res.json({ success: true, data: breakdown });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
