const mysql = require("mysql2/promise");
require("dotenv").config();

async function createTable() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tbl_supplier_type (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE,
                status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("tbl_supplier_type ensured!");
        
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tbl_payment_terms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE,
                status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("tbl_payment_terms ensured!");

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tbl_supplier (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(100) UNIQUE,
                name VARCHAR(150),
                supplierType JSON,
                addressLine1 VARCHAR(255),
                addressLine2 VARCHAR(255),
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100),
                postalCode VARCHAR(20),
                contactPerson VARCHAR(100),
                mobile VARCHAR(50),
                email VARCHAR(100),
                altContact VARCHAR(50),
                gstNumber VARCHAR(50),
                panNumber VARCHAR(50),
                msmeStatus VARCHAR(20),
                paymentTerms VARCHAR(100),
                creditDays INT,
                leadTimeDays INT,
                currency VARCHAR(20),
                bankDetails TEXT,
                categoriesSupplied JSON,
                approvalStatus VARCHAR(50),
                status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("tbl_supplier ensured!");

        await connection.end();
    } catch (e) { console.error(e); }
}
createTable();
