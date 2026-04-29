const mysql = require("mysql2/promise");
require("dotenv").config();

async function checkSchema() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute("DESCRIBE tbl_attachmentdetails");
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (e) { console.error(e); }
}
checkSchema();
