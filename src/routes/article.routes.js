const express = require("express");
const router = express.Router();
const controller = require("../controllers/article.controller");

router.post("/list", controller.getAll);
router.post("/create", controller.create);
router.post("/update", controller.update);
router.post("/delete", controller.delete);
router.post("/generate-code", controller.generateCode);

module.exports = router;
