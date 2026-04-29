const express = require("express");
const router = express.Router();
const GRNController = require("../controllers/grn.controller");

router.get("/generate-code", GRNController.generateCode);
router.get("/get/:id", GRNController.getById);
router.post("/list", GRNController.list);
router.post("/list-bom-wise", GRNController.listBOMWise);
router.post("/insert", GRNController.create);
router.post("/delete", GRNController.delete);
router.post("/po-totals", GRNController.getPoTotals);

module.exports = router;
