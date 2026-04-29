const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixSizeTable() {
    const dbConfig = { 
        host: process.env.DB_HOST || "localhost", 
        user: process.env.DB_USER || "root", 
        password: process.env.DB_PASSWORD || "", 
        database: process.env.DB_NAME || "erp_system" 
    };
    try {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute(`ALTER TABLE tbl_size ADD COLUMN name VARCHAR(100)`);
            console.log("Added column 'name'");
        } catch(e) { console.log("Column 'name' might exist or error:", e.message); }
        
        try {
            await connection.execute(`ALTER TABLE tbl_size ADD COLUMN sizeValue VARCHAR(100)`);
            console.log("Added column 'sizeValue'");
        } catch(e) {}

        const [rows] = await connection.query("DESCRIBE tbl_size");
        console.log("Current tbl_size schema:", rows.map(r => r.Field).join(", "));

        await connection.end();
    } catch (e) {
        console.error("Failed to alter tbl_size", e);
    }
}
fixSizeTable();
