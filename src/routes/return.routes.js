const express = require('express');
const router = express.Router();
const ReturnController = require('../controllers/return.controller');

router.post('/list', ReturnController.list);
router.post('/insert', ReturnController.create);
router.get('/generate-code', ReturnController.generateCode);
router.post('/delete', ReturnController.delete);

module.exports = router;
