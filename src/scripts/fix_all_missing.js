const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixAll() {
    const dbConfig = { 
        host: process.env.DB_HOST || "localhost", 
        user: process.env.DB_USER || "root", 
        password: process.env.DB_PASSWORD || "", 
        database: process.env.DB_NAME || "erp_system" 
    };
    try {
        const connection = await mysql.createConnection(dbConfig);
        const columns = [
            'name', 
            'sizeType', 
            'gender', 
            'sizeGroup', 
            'sizeLength', 
            'widthType', 
            'status'
        ];
        
        for (const col of columns) {
            try {
                await connection.execute(`ALTER TABLE tbl_size ADD COLUMN ${col} VARCHAR(100)`);
                console.log("Added missing column:", col);
            } catch(e) {
                // Ignore if it already exists
            }
        }
        
        console.log("Done ensuring all required form fields exist in tbl_size.");
        await connection.end();
    } catch (e) {
        console.error("Connection failed", e);
    }
}

fixAll();
