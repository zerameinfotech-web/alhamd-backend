const mysql = require("mysql2/promise");
require("dotenv").config();

async function alterTable() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`ALTER TABLE tbl_item_group ADD COLUMN materials JSON`);
        console.log("tbl_item_group altered: materials column added");
        await connection.end();
    } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
            console.log("Column 'materials' already exists.");
        } else {
            console.error("Could not alter tbl_item_group", e.message);
        }
    }
}
alterTable();
