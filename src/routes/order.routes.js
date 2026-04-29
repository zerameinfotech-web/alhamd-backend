const express = require("express");
const router = express.Router();
const controller = require("../controllers/order.controller");

router.post("/generate-code", controller.generateCode);
router.post("/create", controller.create);
router.post("/update", controller.update);
router.post("/list", controller.getAll);
router.post("/dropdown", controller.getDropdown);
router.post("/single", controller.getById);
router.post("/delete", controller.delete);
router.post("/article-sizes", controller.getArticleSizes);
router.get("/test-db", controller.testDb);

module.exports = router;
