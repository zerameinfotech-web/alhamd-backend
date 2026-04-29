const mysql = require("mysql2/promise");
require("dotenv").config();

async function alterSizeTable() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "erp_system",
    };
    try {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute(`ALTER TABLE tbl_size ADD COLUMN sizeLength VARCHAR(50)`);
        } catch(e) {}
        try {
            await connection.execute(`ALTER TABLE tbl_size ADD COLUMN widthType VARCHAR(50)`);
        } catch(e) {}
        console.log("tbl_size altered for new columns!");
        await connection.end();
    } catch (e) {
        console.error("Failed to alter tbl_size", e);
    }
}
alterSizeTable();
