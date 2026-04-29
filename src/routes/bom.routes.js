const express = require("express");
const router = express.Router();
const bomController = require("../controllers/bom.controller");

router.post("/generate-code", bomController.generateCode);
router.post("/create", bomController.create);
router.post("/list", bomController.getAll);
router.post("/update", bomController.update);
router.post("/single", bomController.getById);
router.post("/delete", bomController.delete);
router.get("/update-legacy-codes", bomController.updateLegacyCodes);

module.exports = router;
