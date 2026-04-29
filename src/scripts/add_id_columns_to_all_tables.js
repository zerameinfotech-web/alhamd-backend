const mysql = require("mysql2/promise");
require("dotenv").config({ path: __dirname + "/../../.env" });

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "erp_system"
    };

    const connection = await mysql.createConnection(dbConfig);
    console.log("Connected to database.");

    const alterQueries = [
        // tbl_material
        "ALTER TABLE tbl_material ADD COLUMN uomId INT NULL AFTER unit",
        "ALTER TABLE tbl_material ADD COLUMN colourId INT NULL AFTER colour",
        
        // tbl_article
        "ALTER TABLE tbl_article ADD COLUMN brandId INT NULL AFTER brand",
        "ALTER TABLE tbl_article ADD COLUMN sizeGroupId INT NULL AFTER sizeGroup",
        "ALTER TABLE tbl_article ADD COLUMN defaultColourId INT NULL AFTER defaultColour",
        "ALTER TABLE tbl_article ADD COLUMN currencyId INT NULL AFTER currency",
        "ALTER TABLE tbl_article ADD COLUMN seasonId INT NULL AFTER hscode", // HS Code isn't a master but season is
        
        // tbl_customer
        "ALTER TABLE tbl_customer ADD COLUMN countryId INT NULL AFTER country",
        "ALTER TABLE tbl_customer ADD COLUMN currencyId INT NULL AFTER currency",
        "ALTER TABLE tbl_customer ADD COLUMN paymentTermsId INT NULL AFTER paymentTerms",
        
        // tbl_supplier
        "ALTER TABLE tbl_supplier ADD COLUMN countryId INT NULL AFTER country",
        "ALTER TABLE tbl_supplier ADD COLUMN currencyId INT NULL AFTER currency",
        "ALTER TABLE tbl_supplier ADD COLUMN paymentTermsId INT NULL AFTER paymentTerms",
        "ALTER TABLE tbl_supplier ADD COLUMN cityId INT NULL AFTER city",
        "ALTER TABLE tbl_supplier ADD COLUMN stateId INT NULL AFTER state",
        
        // tbl_orders
        "ALTER TABLE tbl_orders ADD COLUMN currencyId INT NULL AFTER currency",
        "ALTER TABLE tbl_orders ADD COLUMN paymentTermsId INT NULL AFTER paymentTerms",
        
        // tbl_order_items
        "ALTER TABLE tbl_order_items ADD COLUMN colourId INT NULL AFTER colour",
        "ALTER TABLE tbl_order_items ADD COLUMN itemGroupId INT NULL AFTER itemGroup",
        
        // tbl_bom_sections
        "ALTER TABLE tbl_bom_sections ADD COLUMN seasonId INT NULL AFTER season",
        "ALTER TABLE tbl_bom_sections ADD COLUMN colourId INT NULL AFTER colour"
    ];

    for (const sql of alterQueries) {
        try {
            await connection.execute(sql);
            console.log(`Executed: ${sql}`);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log(`Column already exists: ${sql.split('ADD COLUMN ')[1]?.split(' ')[0]}`);
            } else {
                console.error(`Error executing ${sql}:`, e.message);
            }
        }
    }

    await connection.end();
    console.log("Database schema updates complete.");
    process.exit(0);
}

migrate();
