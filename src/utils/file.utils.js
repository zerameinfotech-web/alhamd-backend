const fs = require("fs").promises;
const path = require("path");
const { FILE_UPLOAD } = require("../config/constants");

class FileUtils {
  /**
   * Save base64 file (image or PDF) to file system
   * @param {string} base64Data - Base64 encoded data
   * @param {string} fileType - File type (jpg, png, pdf, etc.)
   * @param {string} fileName - Original file name
   * @returns {object} File info
   */
  static async saveBase64File(base64Data, fileType, fileName = null) {
    try {
      const uploadPath = FILE_UPLOAD.UPLOAD_PATH;

      // Ensure upload directory exists
      await fs.mkdir(uploadPath, { recursive: true });

      // Generate unique filename
      const timestamp = new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "-");
      const uniqueId =
        Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      let fileExtension;
      let fileData;

      if (fileType === "pdf" || fileType === "application/pdf") {
        // Handle PDF
        fileExtension = "pdf";

        // Check if base64 has data URL prefix
        if (base64Data.startsWith("data:")) {
          const matches = base64Data.match(
            /^data:([A-Za-z-+\/]+);base64,(.+)$/,
          );
          if (matches && matches.length === 3) {
            fileData = Buffer.from(matches[2], "base64");
          } else {
            throw new Error("Invalid PDF base64 format");
          }
        } else {
          fileData = Buffer.from(base64Data, "base64");
        }
      } else {
        // Handle images
        fileExtension = this.getExtensionFromMimeType(fileType);

        // Check if base64 has data URL prefix
        if (base64Data.startsWith("data:")) {
          const matches = base64Data.match(
            /^data:([A-Za-z-+\/]+);base64,(.+)$/,
          );
          if (matches && matches.length === 3) {
            fileData = Buffer.from(matches[2], "base64");
          } else {
            throw new Error("Invalid image base64 format");
          }
        } else {
          fileData = Buffer.from(base64Data, "base64");
        }
      }

      const uniqueFileName = `${timestamp}-${uniqueId}.${fileExtension}`;
      const filePath = path.join(uploadPath, uniqueFileName);

      // Save file
      await fs.writeFile(filePath, fileData);

      return {
        fileName: uniqueFileName,
        filePath: filePath,
        fileUrl: `/uploads/${uniqueFileName}`,
        originalName: fileName,
      };
    } catch (error) {
      console.error("Save file error:", error);
      throw new Error("Failed to save file: " + error.message);
    }
  }

  /**
   * Delete file from file system
   * @param {string} fileName - File name
   * @returns {boolean} Success
   */
  static async deleteFile(fileName) {
    try {
      if (!fileName) return true;

      const filePath = path.join(FILE_UPLOAD.UPLOAD_PATH, fileName);

      // Check if file exists
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        return true;
      } catch (error) {
        // File doesn't exist, return true anyway
        console.log("File not found or already deleted:", fileName);
        return true;
      }
    } catch (error) {
      console.error("Delete file error:", error);
      return false;
    }
  }

  /**
   * Validate file type
   * @param {string} fileType - File MIME type
   * @returns {boolean} Valid
   */
  static validateFileType(fileType) {
    const allowedTypes = [
      ...FILE_UPLOAD.ALLOWED_IMAGE_TYPES,
      ...FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES,
    ];

    return (
      allowedTypes.includes(fileType) ||
      FILE_UPLOAD.ALLOWED_IMAGE_TYPES.some((type) => type.includes(fileType)) ||
      allowedTypes.some((type) => fileType.includes(type.split("/")[1]))
    );
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} File extension
   */
  static getExtensionFromMimeType(mimeType) {
    const mimeMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "application/pdf": "pdf",
      jpeg: "jpg",
      jpg: "jpg",
      png: "png",
      gif: "gif",
      webp: "webp",
      pdf: "pdf",
    };
    return mimeMap[mimeType] || mimeType.split("/").pop() || "jpg";
  }

  /**
   * Get file URL
   * @param {string} fileName - File name
   * @returns {string} File URL
   */
  static getFileUrl(fileName) {
    if (!fileName) return null;
    const apiUrl =
      process.env.API_URL ||
      "https://alhamd-backend-production.up.railway.app/api/";
    try {
      const url = new URL(apiUrl);
      return `${url.origin}/api/uploads/${fileName}`;
    } catch (e) {
      // Fallback: strip trailing /api or / and append correctly
      const baseUrl = apiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
      return `${baseUrl}/api/uploads/${fileName}`;
    }
  }

  /**
   * Extract file name from URL
   * @param {string} url - File URL
   * @returns {string} File name
   */
  static extractFileNameFromUrl(url) {
    if (!url) return null;
    return url.split("/").pop();
  }
}

module.exports = FileUtils;
