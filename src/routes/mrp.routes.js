const express = require("express");
const router = express.Router();
const MRPController = require("../controllers/mrp.controller");

router.post("/run", MRPController.run);

module.exports = router;
