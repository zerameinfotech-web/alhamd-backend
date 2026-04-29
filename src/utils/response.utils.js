class ResponseUtils {
  /**
   * Send success response
   * @param {object} res - Response object
   * @param {string} message - Success message
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code
   */
  static success(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null && data !== undefined) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   * @param {object} res - Response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {any} errors - Error details
   */
  static error(res, message, statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Send paginated response
   * @param {object} res - Response object
   * @param {string} message - Success message
   * @param {array} data - Response data
   * @param {object} pagination - Pagination info
   */
  static paginated(res, message, data, pagination) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send created response
   * @param {object} res - Response object
   * @param {string} message - Success message
   * @param {any} data - Response data
   */
  static created(res, message, data = null) {
    return this.success(res, message, data, 201);
  }

  /**
   * Send no content response
   * @param {object} res - Response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send not found response
   * @param {object} res - Response object
   * @param {string} message - Error message
   */
  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  /**
   * Send unauthorized response
   * @param {object} res - Response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   * @param {object} res - Response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = "Access forbidden") {
    return this.error(res, message, 403);
  }

  /**
   * Send bad request response
   * @param {object} res - Response object
   * @param {string} message - Error message
   * @param {any} errors - Error details
   */
  static badRequest(res, message = "Bad request", errors = null) {
    return this.error(res, message, 400, errors);
  }
}

module.exports = ResponseUtils;
