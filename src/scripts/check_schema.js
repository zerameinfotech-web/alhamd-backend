const { promisePool } = require("../config/database");

async function checkSchema() {
    try {
        const tables = ['tbl_customer', 'tbl_supplier', 'tbl_article', 'tbl_material', 'tbl_orders', 'tbl_order_items', 'tbl_bom_sections', 'tbl_bom_items'];
        for (const table of tables) {
            console.log(`\n--- Schema for ${table} ---`);
            const [rows] = await promisePool.query(`DESCRIBE ${table}`);
            console.table(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null })));
        }
    } catch (e) {
        console.error("Failed to check schema", e);
    } finally {
        process.exit();
    }
}

checkSchema();
