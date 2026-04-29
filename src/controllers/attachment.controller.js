const AttachmentService = require("../services/attachment.service");
const ResponseUtils = require("../utils/response.utils");

class AttachmentController {
  /**
   * Upload attachment
   */
  static async uploadAttachment(req, res, next) {
    try {
      const { base64Data, fileType, entityType, fileName, entityId } = req.body;

      if (!base64Data || !fileType || !entityType) {
        return ResponseUtils.badRequest(
          res,
          "base64Data, fileType, and entityType are required"
        );
      }

      const result = await AttachmentService.saveAttachment(
        base64Data,
        fileType,
        entityType,
        fileName,
        entityId
      );

      return ResponseUtils.created(
        res,
        "Attachment uploaded successfully",
        result
      );
    } catch (error) {
      console.error("Upload attachment error:", error);
      next(error);
    }
  }

  /**
   * Get attachments by entity
   */
  static async getAttachments(req, res, next) {
    try {
      const { entityId, entityType } = req.params;

      if (!entityId || !entityType) {
        return ResponseUtils.badRequest(
          res,
          "entityId and entityType are required"
        );
      }

      const attachments = await AttachmentService.getAttachments(
        parseInt(entityId),
        entityType
      );

      return ResponseUtils.success(
        res,
        "Attachments retrieved successfully",
        attachments
      );
    } catch (error) {
      console.error("Get attachments error:", error);
      next(error);
    }
  }

  /**
   * Delete attachment
   */
  static async deleteAttachment(req, res, next) {
    try {
      const { fileName, entityType } = req.params;

      if (!fileName || !entityType) {
        return ResponseUtils.badRequest(
          res,
          "fileName and entityType are required"
        );
      }

      await AttachmentService.deleteAttachment(fileName, entityType);

      return ResponseUtils.success(res, "Attachment deleted successfully");
    } catch (error) {
      console.error("Delete attachment error:", error);

      if (error.message === "Attachment not found") {
        return ResponseUtils.notFound(res, error.message);
      }

      next(error);
    }
  }
}

module.exports = AttachmentController;
