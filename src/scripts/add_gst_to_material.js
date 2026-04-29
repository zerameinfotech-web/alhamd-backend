require("dotenv").config({ path: __dirname + "/../../.env" });
const { promisePool } = require("../config/database");

async function addGstColumns() {
    console.log("Starting GST columns addition...");
    const queries = [
        `ALTER TABLE tbl_material ADD COLUMN IF NOT EXISTS gstSlab INT DEFAULT 0`,
        `ALTER TABLE tbl_material ADD COLUMN IF NOT EXISTS gstAmount DECIMAL(10,2) DEFAULT 0.00`,
        `ALTER TABLE tbl_material ADD COLUMN IF NOT EXISTS totalPrice DECIMAL(10,2) DEFAULT 0.00`
    ];

    for (const sql of queries) {
        try {
            await promisePool.query(sql);
            console.log("Executed successfully:", sql);
        } catch (error) {
            console.error("Error executing query:", sql, error);
        }
    }
    console.log("Finished adding GST columns.");
    process.exit(0);
}

addGstColumns();
