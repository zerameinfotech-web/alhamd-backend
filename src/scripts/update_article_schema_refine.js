const mysql = require("mysql2/promise");
require("dotenv").config();

async function updateSchema() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Update tbl_article
        await connection.execute(`
            ALTER TABLE tbl_article 
            ADD COLUMN IF NOT EXISTS exchangeStartDate DATE,
            ADD COLUMN IF NOT EXISTS exchangeEndDate DATE,
            DROP COLUMN IF EXISTS exchangeDate
        `);
        console.log("tbl_article updated with exchangeStartDate and exchangeEndDate!");

        await connection.end();
    } catch (e) { console.error(e); }
}
updateSchema();
