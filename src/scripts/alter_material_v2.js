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
        
        console.log("Adding 'price' and 'colour' columns to tbl_material...");
        
        // Add price column if it doesn't exist
        try {
            await connection.execute(`ALTER TABLE tbl_material ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00 AFTER unit`);
            console.log("Column 'price' added successfully!");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column 'price' already exists.");
            } else {
                throw e;
            }
        }

        // Add colour column if it doesn't exist
        try {
            await connection.execute(`ALTER TABLE tbl_material ADD COLUMN colour VARCHAR(100) NULL AFTER price`);
            console.log("Column 'colour' added successfully!");
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column 'colour' already exists.");
            } else {
                throw e;
            }
        }

        await connection.end();
        console.log("Table alterations complete.");
        process.exit(0);
    } catch (e) {
        console.error("Could not alter tbl_material:", e.message);
        process.exit(1);
    }
}

alterTable();
