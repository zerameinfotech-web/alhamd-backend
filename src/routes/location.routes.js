const express = require("express");
const router = express.Router();
const LocationController = require("../controllers/location.controller");
const { verifyToken } = require("../middleware/auth");

// Using verifyToken to match PHP behavior which had "include_once 'auth/auth.php'"
router.get("/countries", verifyToken, LocationController.getCountries);
router.post("/states", verifyToken, LocationController.getStates);
router.post("/cities", verifyToken, LocationController.getCities);

module.exports = router;
