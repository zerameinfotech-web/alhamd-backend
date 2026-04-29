const AttachmentModel = require("../models/attachment.model");
const FileUtils = require("../utils/file.utils");
const DatabaseUtils = require("../utils/database.utils");

class AttachmentService {
  /**
   * Save attachment and create entity mapping
   */
  static async saveAttachment(
    base64Data,
    fileType,
    entityType,
    fileName,
    entityId
  ) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // Save file to file system
      const fileInfo = await FileUtils.saveBase64File(
        base64Data,
        fileType,
        fileName
      );

      // Insert into attachment_details table
      const attachmentId = await AttachmentModel.create({
        url: fileInfo.fileName,
        fileName: fileName || fileInfo.fileName,
        fileType: fileType,
        type: entityType,
      });

      // Create entity attachment mapping if entityId provided
      if (entityId) {
        await AttachmentModel.createEntityAttachment(
          attachmentId,
          entityId,
          entityType
        );
      }

      return {
        attachmentId,
        ...fileInfo,
      };
    });
  }

  /**
   * Get attachments for an entity
   */
  static async getAttachments(entityId, entityType) {
    const attachments = await AttachmentModel.getByEntity(entityId, entityType);

    // Build full URLs
    return attachments.map((att) => ({
      id: att.id,
      url: FileUtils.getFileUrl(att.url),
      fileName: att.fileName,
      type: att.type,
      createdAt: att.createdAt,
    }));
  }

  /**
   * Delete attachment
   */
  static async deleteAttachment(fileName, entityType) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // Get attachment ID
      const attachments = await AttachmentModel.getByUrlAndType(
        fileName,
        entityType
      );

      if (attachments.length === 0) {
        throw new Error("Attachment not found");
      }

      const attachmentId = attachments[0].id;

      // Delete entity attachment mapping
      await AttachmentModel.deleteEntityAttachments(attachmentId);

      // Delete attachment record
      await AttachmentModel.delete(attachmentId);

      // Delete physical file
      await FileUtils.deleteFile(fileName);

      return true;
    });
  }

  /**
   * Handle multiple attachments (insert/update/delete)
   */
  static async handleMultipleAttachments(attachments, entityId, entityType) {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    const results = [];

    for (const attachment of attachments) {
      try {
        if (attachment.deleted) {
          // Delete attachment
          const fileName = FileUtils.extractFileNameFromUrl(
            attachment.imageData
          );
          if (fileName) {
            await this.deleteAttachment(fileName, entityType);
          }
        } else {
          // Check if it's a URL (existing attachment)
          if (/^https?:\/\//.test(attachment.imageData)) {
            continue;
          }

          // Check if it's valid base64 or data URL
          if (
            /^data:(image\/[a-zA-Z]+|application\/pdf);base64,/.test(
              attachment.imageData
            ) ||
            /^[a-zA-Z0-9\/+=]+$/.test(attachment.imageData)
          ) {
            const result = await this.saveAttachment(
              attachment.imageData,
              attachment.imageType,
              entityType,
              attachment.fileName,
              entityId
            );
            results.push(result);
          }
        }
      } catch (error) {
        console.error("Attachment handling error:", error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Delete all entity attachments
   */
  static async deleteAllEntityAttachments(entityId, entityType) {
    const attachments = await AttachmentModel.getByEntity(entityId, entityType);

    for (const attachment of attachments) {
      await this.deleteAttachment(attachment.url, entityType);
    }

    return true;
  }
}

module.exports = AttachmentService;
