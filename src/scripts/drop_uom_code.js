require("dotenv").config({ path: __dirname + "/../../.env" });
const { promisePool } = require("../config/database");

async function dropUOMCode() {
    console.log("Dropping 'code' column from tbl_uom...");
    try {
        await promisePool.query("ALTER TABLE tbl_uom DROP COLUMN code");
        console.log("Column 'code' dropped successfully!");
    } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log("Column 'code' already dropped or does not exist.");
        } else {
            console.error("Error dropping column:", error);
        }
    }
    process.exit(0);
}

dropUOMCode();
