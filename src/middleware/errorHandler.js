const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);

  // Default error
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";

  // Mongoose validation error
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(error.errors)
      .map((err) => err.message)
      .join(", ");
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // MySQL errors
  if (error.code === "ER_DUP_ENTRY") {
    statusCode = 400;
    message = "Duplicate entry found";
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    statusCode = 400;
    message = "Referenced record not found";
  }

  // Multer errors
  if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 400;
    message = "File size too large";
  }

  // Response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      error: error,
    }),
  });
};

module.exports = errorHandler;
