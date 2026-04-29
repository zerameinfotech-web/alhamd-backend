require("dotenv").config({ path: __dirname + "/../../.env" });
const { promisePool } = require("../config/database");

async function alterBOMItems() {
    console.log("Adding columns to tbl_bom_items...");
    const additions = [
        "ALTER TABLE tbl_bom_items ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00",
        "ALTER TABLE tbl_bom_items ADD COLUMN gstSlab VARCHAR(50) DEFAULT '0%'",
        "ALTER TABLE tbl_bom_items ADD COLUMN gstPrice DECIMAL(10,2) DEFAULT 0.00",
        "ALTER TABLE tbl_bom_items ADD COLUMN totalPrice DECIMAL(10,2) DEFAULT 0.00",
        "ALTER TABLE tbl_bom_items ADD COLUMN color VARCHAR(100) NULL"
    ];

    for (const query of additions) {
        try {
            await promisePool.query(query);
            console.log(`Executed: ${query}`);
        } catch (error) {
            if (error.code === 'ER_DUP_COLUMN_NAME') {
                console.log(`Column already exists: ${query.split('ADD COLUMN ')[1].split(' ')[0]}`);
            } else {
                console.error(`Error executing: ${query}`, error);
            }
        }
    }
    console.log("BOM Items table alterations complete.");
    process.exit(0);
}

alterBOMItems();
