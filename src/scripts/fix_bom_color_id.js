require("dotenv").config({ path: __dirname + "/../../.env" });
const { promisePool } = require("../config/database");

async function fixBOMColorID() {
    console.log("Removing 'color' column from tbl_bom_items...");
    try {
        await promisePool.query("ALTER TABLE tbl_bom_items DROP COLUMN color");
        console.log("Column 'color' dropped successfully!");
    } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            console.log("Column 'color' already dropped or does not exist.");
        } else {
            console.error("Error dropping column:", error);
        }
    }
    process.exit(0);
}

fixBOMColorID();
