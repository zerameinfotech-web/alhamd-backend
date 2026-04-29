const express = require("express");
const router = express.Router();
const sizeLookupsController = require("../controllers/sizeLookups.controller");
const { verifyToken } = require("../middleware/auth");

router.post("/types", verifyToken, sizeLookupsController.getSizeTypes);
router.post("/genders", verifyToken, sizeLookupsController.getGenders);
router.post("/groups", verifyToken, sizeLookupsController.getSizeGroups);

module.exports = router;
