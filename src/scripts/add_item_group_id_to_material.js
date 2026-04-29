const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/../../.env" });

async function alterTable() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "erp_system"
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        console.log("Adding 'itemGroupId' column to tbl_material...");
        
        try {
            await connection.execute(`ALTER TABLE tbl_material ADD COLUMN itemGroupId INT NULL AFTER colour`);
            console.log("Column 'itemGroupId' added successfully!");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column 'itemGroupId' already exists.");
            } else {
                throw e;
            }
        }

        await connection.end();
        console.log("Table alteration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Could not alter tbl_material:", e.message);
        process.exit(1);
    }
}

alterTable();
