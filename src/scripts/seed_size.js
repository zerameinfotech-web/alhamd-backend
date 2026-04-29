const mysql = require("mysql2/promise");
require("dotenv").config();

async function createSizeTable() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "erp_system",
    };
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tbl_size (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(100) UNIQUE,
                name VARCHAR(100),
                sizeType VARCHAR(100),
                gender VARCHAR(100),
                sizeGroup VARCHAR(100),
                status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("tbl_size ensured!");
        await connection.end();
    } catch (e) {
        console.error("Failed to make tbl_size", e);
    }
}
createSizeTable();
