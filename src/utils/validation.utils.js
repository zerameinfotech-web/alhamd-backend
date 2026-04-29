class ValidationUtils {
  /**
   * Validate email
   * @param {string} email - Email address
   * @returns {boolean} Valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number
   * @returns {boolean} Valid
   */
  static isValidPhone(phone) {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate password strength
   * @param {string} password - Password
   * @returns {object} Validation result
   */
  static validatePassword(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const isValid = password.length >= minLength;
    const strength = [
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    ].filter(Boolean).length;

    return {
      isValid,
      strength: isValid
        ? strength >= 3
          ? "strong"
          : strength >= 2
          ? "medium"
          : "weak"
        : "invalid",
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    };
  }

  /**
   * Sanitize string
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(str) {
    if (typeof str !== "string") return "";
    return str.trim().replace(/<[^>]*>/g, "");
  }

  /**
   * Validate required fields
   * @param {object} data - Data object
   * @param {array} requiredFields - Required field names
   * @returns {object} Validation result
   */
  static validateRequiredFields(data, requiredFields) {
    const missingFields = [];

    for (const field of requiredFields) {
      if (
        !data[field] ||
        (typeof data[field] === "string" && !data[field].trim())
      ) {
        missingFields.push(field);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Validate date
   * @param {string} dateString - Date string
   * @returns {boolean} Valid
   */
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Validate number range
   * @param {number} value - Value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {boolean} Valid
   */
  static isInRange(value, min, max) {
    return value >= min && value <= max;
  }
}

module.exports = ValidationUtils;
