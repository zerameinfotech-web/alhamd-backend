const express = require("express");
const router = express.Router();
const controller = require("../controllers/colourLookups.controller");
const { verifyToken } = require("../middleware/auth");

router.post("/categories", verifyToken, controller.getCategories);
router.post("/finish-types", verifyToken, controller.getFinishTypes);
router.post("/groups", verifyToken, controller.getColourGroups);

module.exports = router;
