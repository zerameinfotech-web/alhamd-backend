const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/../../.env" });

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "backend"
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database:", dbConfig.database);

        const alterQueries = [
            // tbl_colour
            "ALTER TABLE tbl_colour ADD COLUMN categoryId INT NULL AFTER category",
            "ALTER TABLE tbl_colour ADD COLUMN finishTypeId INT NULL AFTER finishType",
            "ALTER TABLE tbl_colour ADD COLUMN colourGroupId INT NULL AFTER colourGroup",
            
            // tbl_size
            "ALTER TABLE tbl_size ADD COLUMN genderId INT NULL AFTER gender",
            "ALTER TABLE tbl_size ADD COLUMN sizeTypeId INT NULL AFTER sizeType"
        ];

        for (const sql of alterQueries) {
            try {
                await connection.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Field already exists in query: ${sql}`);
                } else {
                    console.error(`Error executing ${sql}:`, e.message);
                }
            }
        }

        console.log("\nDatabase schema updates complete.");
        
    } catch (e) {
        console.error("Migration failed:", e.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

migrate();
