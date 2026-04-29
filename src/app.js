const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employee.routes");
const locationRoutes = require("./routes/location.routes");
const customerRoutes = require("./routes/customer.routes");
const supplierRoutes = require("./routes/supplier.routes");
const supplierTypeRoutes = require("./routes/supplier-type.routes");
const paymentTermsRoutes = require("./routes/payment-terms.routes");
const articleRoutes = require("./routes/article.routes");
const itemGroupRoutes = require("./routes/item-group.routes");
const materialRoutes = require("./routes/material.routes");
const colourRoutes = require("./routes/colour.routes");
const colourLookupsRoutes = require("./routes/colourLookups.routes");
const sizeRoutes = require("./routes/size.routes");
const sizeLookupsRoutes = require("./routes/sizeLookups.routes");
const uomRoutes = require("./routes/uom.routes");
const warehouseRoutes = require("./routes/warehouse.routes");
const brandRoutes = require("./routes/brand.routes");
const currencyRoutes = require("./routes/currency.routes");
const seasonRoutes = require("./routes/season.routes");
const orderRoutes = require("./routes/order.routes");
const bomRoutes = require("./routes/bom.routes");
const purchaseOrderRoutes = require("./routes/purchase-order.routes");
const grnRoutes = require("./routes/grn.routes");
const returnRoutes = require("./routes/return.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const qcRoutes = require("./routes/qc.routes");
// const punchRoutes = require("./routes/punch.routes");
// const categoryRoutes = require("./routes/category.routes");
// const materialRoutes = require("./routes/material.routes");
// const brandRoutes = require("./routes/brand.routes");
// const locationMasterRoutes = require("./routes/location_master.routes");
// const ironman PackingPriceRoutes = require("./routes/ironman_packing_price.routes");
// const purchaseVendorRoutes = require("./routes/purchase_vendor.routes");
// const readymadeConsumptionRoutes = require("./routes/readymade_consumption.routes");
// const jobVendorRoutes = require("./routes/job_vendor.routes");
// const leadRoutes = require("./routes/lead.routes");
// const schoolModuleRoutes = require("./routes/schoolModule.routes");
// const purchaseEntryRoutes = require("./routes/purchase_entry.routes");
// const orderRoutes = require("./routes/order.routes"); // now registered above
// const productionScanRoutes = require("./routes/production_scan.routes");
// const deliveryChallanRoutes = require("./routes/delivery_challan.routes");
// const dashboardRoutes = require("./routes/dashboard.routes");
// const transportRoutes = require("./routes/transport.routes");
// const settingsRoutes = require("./routes/settings.routes");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS configuration
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Static files
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use(
  "/api/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(uploadsDir)
);

// Diagnostic route for uploads
app.get("/api/test-file/:filename", (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  const exists = require("fs").existsSync(filePath);
  res.json({
    exists,
    path: filePath,
    wd: process.cwd(),
    dirname: __dirname
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/supplier-type", supplierTypeRoutes);
app.use("/api/payment-terms", paymentTermsRoutes);
app.use("/api/article", articleRoutes);
app.use("/api/item-group", itemGroupRoutes);
app.use("/api/material", materialRoutes);
app.use("/api/colour", colourRoutes);
app.use("/api/colour_lookups", colourLookupsRoutes);
app.use("/api/size", sizeRoutes);
app.use("/api/size_lookups", sizeLookupsRoutes);
app.use("/api/uom", uomRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/brand", brandRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/season", seasonRoutes);
// app.use("/api/punch", punchRoutes);
// app.use("/api/category", categoryRoutes);
// app.use("/api/material", materialRoutes);
// app.use("/api/brand", brandRoutes);
// app.use("/api/location-master", locationMasterRoutes);
// app.use("/api/ironman-packing-price", ironman_packing_price.routes);
// app.use("/api/purchase-vendor", purchaseVendorRoutes);
// app.use("/api/readymade-consumption", readymadeConsumptionRoutes);
// app.use("/api/job-vendor", jobVendorRoutes);
// app.use("/api/lead", leadRoutes);
// app.use("/api/school-module", schoolModuleRoutes);
// app.use("/api/purchase-entry", purchaseEntryRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/bom", bomRoutes);
app.use("/api/purchase-order", purchaseOrderRoutes);
app.use("/api/grn", grnRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/qc", qcRoutes);
// app.use("/api/production-scan", productionScanRoutes);
// app.use("/api/dc", deliveryChallanRoutes);
// app.use("/api/dashboard", dashboardRoutes);
// app.use("/api/transport", transportRoutes);
// app.use("/api/settings", settingsRoutes);
// app.use("/api/track", require('./routes/track.routes'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;