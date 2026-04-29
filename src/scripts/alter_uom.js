const mysql = require("mysql2/promise");
require("dotenv").config();

async function alterTable() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`ALTER TABLE tbl_uom MODIFY code VARCHAR(100) NULL`);
        console.log("tbl_uom code made nullable!");
        await connection.end();
    } catch (e) { console.error("Could not alter tbl_uom", e.message); }
}
alterTable();
