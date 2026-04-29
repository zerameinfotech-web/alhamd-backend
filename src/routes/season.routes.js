const express = require("express");
const router = express.Router();
const controller = require("../controllers/season.controller");

router.post("/create", controller.create);
router.post("/update", controller.update);
router.post("/list", controller.getAll);
router.post("/delete", controller.delete);

module.exports = router;
