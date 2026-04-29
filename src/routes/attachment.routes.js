const express = require("express");
const router = express.Router();
const AttachmentController = require("../controllers/attachment.controller");
const { verifyToken } = require("../middleware/auth");

// All routes require authentication
router.use(verifyToken);

// Upload attachment
router.post("/upload", AttachmentController.uploadAttachment);

// Get attachments by entity
router.get("/:entityType/:entityId", AttachmentController.getAttachments);

// Delete attachment
router.delete("/:entityType/:fileName", AttachmentController.deleteAttachment);

module.exports = router;
