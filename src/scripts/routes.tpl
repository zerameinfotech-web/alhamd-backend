const express = require("express");
const router = express.Router();
const controller = require("../controllers/[[NAME]].controller");

router.get("/generate-code", controller.generateCode);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.delete("/:id", controller.delete);

module.exports = router;
