const express = require("express");
const router = express.Router();
const QCController = require("../controllers/qc.controller");

router.post("/list", QCController.list);
router.post("/list-bom-wise", QCController.listBOMWise);
router.get("/next-code", QCController.generateNextCode);
router.get("/get/:id", QCController.getById);
router.post("/insert", QCController.create);
router.post("/update", QCController.update);
router.post("/delete", QCController.delete);

module.exports = router;
