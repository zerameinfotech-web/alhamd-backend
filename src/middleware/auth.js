const jwt = require("jsonwebtoken");
const { promisePool } = require("../config/database");
const { TABLES, ROLES } = require("../config/constants");
const ms = require("ms");
// Generate access token
exports.generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "5d" }
  );
};

// Generate refresh token
exports.generateRefreshToken = async (user) => {
  const expiresIn = process.env.JWT_REFRESH_EXPIRE || "7d";

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" }
  );

  // Calculate expiration date (7 days from now)
  // const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(Date.now() + ms(expiresIn));
  // Store refresh token in database
  // await promisePool.execute(
  //   `INSERT INTO ${TABLES.REFRESH_TOKENS} (userId, token, expiresAt) VALUES (?, ?, ?)`,
  //   [user.id, refreshToken, expiresAt]
  // );

  return refreshToken;
};

// Verify JWT token middleware
exports.verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const [users] = await promisePool.execute(
      `SELECT id, email, fullName, role FROM ${TABLES.ADMIN} WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Attach user to request object
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Admin only middleware
exports.adminOnly = (req, res, next) => {
  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};

// Super admin only middleware
exports.superAdminOnly = (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Super admin access required",
    });
  }
  next();
};
