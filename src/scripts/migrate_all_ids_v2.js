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
            // tbl_material
            "ALTER TABLE tbl_material ADD COLUMN uomId INT NULL AFTER unit",
            "ALTER TABLE tbl_material ADD COLUMN colourId INT NULL AFTER colour",
            "ALTER TABLE tbl_material ADD COLUMN itemGroupId INT NULL AFTER itemGroup",
            
            // tbl_article
            "ALTER TABLE tbl_article ADD COLUMN brandId INT NULL AFTER brand",
            "ALTER TABLE tbl_article ADD COLUMN sizeGroupId INT NULL AFTER sizeGroup",
            "ALTER TABLE tbl_article ADD COLUMN defaultColourId INT NULL AFTER defaultColour",
            "ALTER TABLE tbl_article ADD COLUMN currencyId INT NULL AFTER currency",
            "ALTER TABLE tbl_article ADD COLUMN seasonId INT NULL AFTER hscode",
            
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
            "ALTER TABLE tbl_supplier ADD COLUMN categoryId INT NULL",
            
            // tbl_orders
            "ALTER TABLE tbl_orders ADD COLUMN customerId INT NULL AFTER orderDate",
            "ALTER TABLE tbl_orders ADD COLUMN currencyId INT NULL AFTER currency",
            "ALTER TABLE tbl_orders ADD COLUMN paymentTermsId INT NULL AFTER paymentTerms",
            
            // tbl_order_items
            "ALTER TABLE tbl_order_items ADD COLUMN articleId INT NULL AFTER orderId",
            "ALTER TABLE tbl_order_items ADD COLUMN colourId INT NULL AFTER colour",
            "ALTER TABLE tbl_order_items ADD COLUMN itemGroupId INT NULL AFTER itemGroup",
            
            // tbl_bom
            "ALTER TABLE tbl_bom ADD COLUMN articleId INT NULL AFTER bomCode",
            
            // tbl_bom_sections
            "ALTER TABLE tbl_bom_sections ADD COLUMN articleId INT NULL AFTER bomId",
            "ALTER TABLE tbl_bom_sections ADD COLUMN orderId INT NULL AFTER articleId",
            "ALTER TABLE tbl_bom_sections ADD COLUMN seasonId INT NULL AFTER season",
            "ALTER TABLE tbl_bom_sections ADD COLUMN colourId INT NULL AFTER colour",

            // tbl_bom_items
            "ALTER TABLE tbl_bom_items ADD COLUMN itemGroupId INT NULL AFTER sectionId",
            "ALTER TABLE tbl_bom_items ADD COLUMN materialId INT NULL AFTER itemCode",
            "ALTER TABLE tbl_bom_items ADD COLUMN colorId INT NULL AFTER description",
            "ALTER TABLE tbl_bom_items ADD COLUMN uomId INT NULL AFTER colorId",
            "ALTER TABLE tbl_bom_items ADD COLUMN supplierId INT NULL AFTER totalPrice"
        ];

        for (const sql of alterQueries) {
            try {
                await connection.execute(sql);
                console.log(`Executed: ${sql}`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') {
                    console.log(`Field already exists in query: ${sql}`);
                } else if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    console.log(`Field not found in query: ${sql}`);
                } else {
                    console.error(`Error executing ${sql}:`, e.message);
                }
            }
        }

        console.log("\nDatabase schema updates complete.");
        
        // Optional: Run migration logic to map existing names to IDs if matching tables exist
        console.log("Migration finished.");

    } catch (e) {
        console.error("Migration failed:", e.message);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

migrate();
