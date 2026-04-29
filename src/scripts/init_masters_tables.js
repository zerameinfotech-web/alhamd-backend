require("dotenv").config({ path: __dirname + "/../../.env" });
const DatabaseUtils = require("../utils/database.utils");
const { promisePool } = require("../config/database");

const queries = [
    // 1. Customer
    `CREATE TABLE IF NOT EXISTS tbl_customer (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        country VARCHAR(100),
        billingAddress TEXT,
        shippingAddress TEXT,
        contactPerson VARCHAR(100),
        mobile VARCHAR(50),
        email VARCHAR(100),
        currency VARCHAR(50),
        paymentTerms VARCHAR(100),
        gstVatNo VARCHAR(100),
        portofDischarge VARCHAR(100),
        finalDestination VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 2. Supplier
    `CREATE TABLE IF NOT EXISTS tbl_supplier (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        supplierType JSON,
        addressLine1 TEXT,
        addressLine2 TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postalCode VARCHAR(50),
        contactPerson VARCHAR(100),
        mobile VARCHAR(50),
        email VARCHAR(100),
        altContact VARCHAR(50),
        gstNumber VARCHAR(100),
        panNumber VARCHAR(100),
        msmeStatus VARCHAR(50),
        paymentTerms VARCHAR(100),
        creditDays INT,
        leadTimeDays INT,
        currency VARCHAR(50),
        bankDetails TEXT,
        categoriesSupplied JSON,
        approvalStatus VARCHAR(50),
        portofDischarge VARCHAR(100),
        finalDestination VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 3. Article
    `CREATE TABLE IF NOT EXISTS tbl_article (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        brand VARCHAR(100),
        productType VARCHAR(100),
        hsCode VARCHAR(100),
        genderType VARCHAR(50),
        sizeGroup VARCHAR(50),
        defaultColour VARCHAR(50),
        standardCost DECIMAL(10,2),
        exchangeRate JSON,
        weightPerPair DECIMAL(10,2),
        currency VARCHAR(50),
        sellingPrice DECIMAL(10,2),
        exportDomestic VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 4. Item Group (formerly Material Group)
    `CREATE TABLE IF NOT EXISTS tbl_item_group (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 5. Material
    `CREATE TABLE IF NOT EXISTS tbl_material (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        unit VARCHAR(50),
        price DECIMAL(10,2) DEFAULT 0.00,
        colour VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 6. Colour
    `CREATE TABLE IF NOT EXISTS tbl_colour (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(100),
        category VARCHAR(100),
        shadeNo VARCHAR(100),
        pantoneRef VARCHAR(100),
        finishType VARCHAR(100),
        colourGroup VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 7. Size
    `CREATE TABLE IF NOT EXISTS tbl_size (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        value VARCHAR(50),
        sizeType VARCHAR(50),
        genderType VARCHAR(50),
        sizeGroup VARCHAR(50),
        lengthCm VARCHAR(50),
        widthType VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 8. UOM
    `CREATE TABLE IF NOT EXISTS tbl_uom (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 9. Warehouse
    `CREATE TABLE IF NOT EXISTS tbl_warehouse (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        warehouseType VARCHAR(100),
        location TEXT,
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`,

    // 10. Brand
    `CREATE TABLE IF NOT EXISTS tbl_brand (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        accessoryIds JSON,
        status VARCHAR(50) DEFAULT 'Active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt DATETIME NULL
    )`
];

async function initializeTables() {
    console.log("Starting table creation...");
    for (const sql of queries) {
        try {
            await promisePool.query(sql);
            console.log("Executed successfully:", sql.substring(0, 50) + "...");
        } catch (error) {
            console.error("Error executing query:", sql.substring(0, 50), error);
        }
    }
    console.log("Finished generating tables.");
    process.exit(0);
}

initializeTables();
