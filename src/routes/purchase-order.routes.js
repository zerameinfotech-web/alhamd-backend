const express = require("express");
const router = express.Router();
const PurchaseOrderController = require("../controllers/purchase-order.controller");

router.post("/list", PurchaseOrderController.list);
router.post("/single", PurchaseOrderController.getById);
router.post("/update", PurchaseOrderController.update);
router.post("/delete", PurchaseOrderController.delete);
router.get("/next-code", PurchaseOrderController.generateNextCode);
router.post("/list-bom-wise", PurchaseOrderController.listBOMWise);
router.post("/insert", PurchaseOrderController.create);

module.exports = router;
