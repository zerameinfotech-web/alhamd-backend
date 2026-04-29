const express = require("express");
const router = express.Router();
const controller = require("../controllers/currency.controller");
const { verifyToken } = require("../middleware/auth");

router.post("/list", verifyToken, controller.getList); 

module.exports = router;
