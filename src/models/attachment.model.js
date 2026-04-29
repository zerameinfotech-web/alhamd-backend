const DatabaseUtils = require("../utils/database.utils");
const { TABLES } = require("../config/constants");

class AttachmentModel {
  /**
   * Create attachment record
   */
  static async create(attachmentData) {
    return await DatabaseUtils.insert(TABLES.ATTACHMENT_DETAILS, {
      url: attachmentData.url,
      fileName: attachmentData.fileName,
      type: attachmentData.type,
    });
  }

  /**
   * Create entity attachment mapping
   */
  static async createEntityAttachment(attachmentId, entityId, entityType) {
    return await DatabaseUtils.insert(TABLES.ENTITY_ATTACHMENT, {
      attachmentId,
      entityId,
      entityType,
    });
  }

  /**
   * Get attachments by entity
   */
  static async getByEntity(entityId, entityType) {
    const sql = `
      SELECT ad.id, ad.url, ad.fileName, ad.type, ad.createdAt
      FROM ${TABLES.ATTACHMENT_DETAILS} ad
      INNER JOIN ${TABLES.ENTITY_ATTACHMENT} ea ON ad.id = ea.attachmentId
      WHERE ea.entityId = ? AND ea.entityType = ?
      ORDER BY ad.createdAt DESC
    `;

    return await DatabaseUtils.query(sql, [
      entityId,
      entityType,
    ]);
  }

  /**
   * Get attachment by URL and type
   */
  static async getByUrlAndType(url, type) {
    return await DatabaseUtils.select(
      TABLES.ATTACHMENT_DETAILS,
      ["id", "url", "fileName", "type"],
      "url = ? AND type = ?",
      [url, type]
    );
  }

  /**
   * Delete attachment
   */
  static async delete(attachmentId) {
    return await DatabaseUtils.hardDelete(TABLES.ATTACHMENT_DETAILS, "id = ?", [
      attachmentId,
    ]);
  }

  /**
   * Delete entity attachments
   */
  static async deleteEntityAttachments(attachmentId) {
    return await DatabaseUtils.hardDelete(
      TABLES.ENTITY_ATTACHMENT,
      "attachmentId = ?",
      [attachmentId]
    );
  }

  /**
   * Get attachment by ID
   */
  static async getById(attachmentId) {
    const result = await DatabaseUtils.selectById(
      TABLES.ATTACHMENT_DETAILS,
      attachmentId
    );
    return result[0] || null;
  }
}

module.exports = AttachmentModel;
