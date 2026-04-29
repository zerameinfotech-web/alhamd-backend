const express = require("express");
const router = express.Router();
const controller = require("../controllers/customer.controller");

router.post("/generate-code", controller.generateCode);
router.post("/create", controller.create);
router.post("/update", controller.update);
router.post("/list", controller.getAll);
router.post("/single", controller.getById);
router.post("/delete", controller.delete);

module.exports = router;
