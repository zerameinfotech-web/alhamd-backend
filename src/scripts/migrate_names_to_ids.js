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

    // Helper to get a Map of [Name/Code] -> ID
    async function getLookupMap(tableName, keyColumn) {
        const [rows] = await connection.execute(`SELECT id, ${keyColumn} FROM ${tableName}`);
        const map = new Map();
        rows.forEach(row => {
            if (row[keyColumn]) map.set(String(row[keyColumn]).toLowerCase().trim(), row.id);
        });
        return map;
    }

    // Helper to update a table
    async function updateTable(tableName, sourceColumn, targetColumn, lookupMap) {
        const [rows] = await connection.execute(`SELECT id, ${sourceColumn} FROM ${tableName} WHERE ${targetColumn} IS NULL AND ${sourceColumn} IS NOT NULL`);
        console.log(`Migrating ${tableName}.${sourceColumn} to ${targetColumn}... Found ${rows.length} records.`);
        
        for (const row of rows) {
            const val = String(row[sourceColumn]).toLowerCase().trim();
            const id = lookupMap.get(val);
            if (id) {
                await connection.execute(`UPDATE ${tableName} SET ${targetColumn} = ? WHERE id = ?`, [id, row.id]);
            }
        }
    }

    try {
        // Fetch All Maps
        const uomMap = await getLookupMap('tbl_uom', 'name');
        const colourMap = await getLookupMap('tbl_colour', 'name');
        const brandMap = await getLookupMap('tbl_brand', 'name');
        const sizeGroupMap = await getLookupMap('tbl_size_group', 'name');
        const currencyMap = await getLookupMap('tbl_currency', 'code');
        const countryMap = await getLookupMap('tbl_countrydetails', 'countryName');
        const stateMap = await getLookupMap('tbl_statedetails', 'stateName');
        const cityMap = await getLookupMap('tbl_citydetails', 'cityName');
        const seasonMap = await getLookupMap('tbl_season', 'name');
        const paymentTermsMap = await getLookupMap('tbl_payment_terms', 'name');
        const itemGroupMap = await getLookupMap('tbl_item_group', 'name');

        // Execute Migrations
        // Material
        await updateTable('tbl_material', 'unit', 'uomId', uomMap);
        await updateTable('tbl_material', 'colour', 'colourId', colourMap);

        // Article
        await updateTable('tbl_article', 'brand', 'brandId', brandMap);
        await updateTable('tbl_article', 'sizeGroup', 'sizeGroupId', sizeGroupMap);
        await updateTable('tbl_article', 'defaultColour', 'defaultColourId', colourMap);
        await updateTable('tbl_article', 'currency', 'currencyId', currencyMap);
        await updateTable('tbl_article', 'season', 'seasonId', seasonMap);

        // Customer
        await updateTable('tbl_customer', 'country', 'countryId', countryMap);
        await updateTable('tbl_customer', 'currency', 'currencyId', currencyMap);
        await updateTable('tbl_customer', 'paymentTerms', 'paymentTermsId', paymentTermsMap);

        // Supplier
        await updateTable('tbl_supplier', 'country', 'countryId', countryMap);
        await updateTable('tbl_supplier', 'currency', 'currencyId', currencyMap);
        await updateTable('tbl_supplier', 'paymentTerms', 'paymentTermsId', paymentTermsMap);
        await updateTable('tbl_supplier', 'city', 'cityId', cityMap);
        await updateTable('tbl_supplier', 'state', 'stateId', stateMap);

        // Orders
        await updateTable('tbl_orders', 'currency', 'currencyId', currencyMap);
        await updateTable('tbl_orders', 'paymentTerms', 'paymentTermsId', paymentTermsMap);

        // Order Items
        await updateTable('tbl_order_items', 'colour', 'colourId', colourMap);
        await updateTable('tbl_order_items', 'itemGroup', 'itemGroupId', itemGroupMap);

        // BOM Sections
        await updateTable('tbl_bom_sections', 'season', 'seasonId', seasonMap);
        await updateTable('tbl_bom_sections', 'colour', 'colourId', colourMap);

        // Special Case: Article Item Group (Multi-select JSON array)
        const [articles] = await connection.execute('SELECT id, itemGroup FROM tbl_article WHERE itemGroup IS NOT NULL');
        console.log(`Migrating tbl_article.itemGroup JSON arrays... Found ${articles.length} records.`);
        for (const art of articles) {
            try {
                const groups = typeof art.itemGroup === 'string' ? JSON.parse(art.itemGroup) : art.itemGroup;
                if (Array.isArray(groups)) {
                    const idArray = groups
                        .map(g => String(g).toLowerCase().trim())
                        .map(name => itemGroupMap.get(name))
                        .filter(id => id !== undefined);
                    
                    if (idArray.length > 0) {
                        await connection.execute('UPDATE tbl_article SET itemGroup = ? WHERE id = ?', [JSON.stringify(idArray), art.id]);
                    }
                }
            } catch (e) {
                console.warn(`Failed to migrate itemGroup for article ID ${art.id}:`, e.message);
            }
        }

        console.log("Migration successful.");
    } catch (e) {
        console.error("Migration failed:", e.message);
    } finally {
        await connection.end();
        process.exit(0);
    }
}

migrate();
