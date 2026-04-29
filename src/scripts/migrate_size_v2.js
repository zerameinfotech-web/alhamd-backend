const { promisePool } = require("../config/database");

async function migrateSizeV2() {
    console.log("Starting migration: Adding Size Master columns...");
    
    // Using simple VARCHAR for these as they are mainly for grouping and labels
    const columnsToAdd = [
        { name: 'sizeGroup', type: 'VARCHAR(100)' },
        { name: 'sizeFrom', type: 'VARCHAR(50)' },
        { name: 'sizeTo', type: 'VARCHAR(50)' },
        { name: 'gender', type: 'VARCHAR(50)' },
        { name: 'widthType', type: 'VARCHAR(50)' }
    ];

    try {
        for (const col of columnsToAdd) {
            try {
                // Check if column exists first to avoid error
                const [checkRows] = await promisePool.execute(`
                    SELECT COUNT(*) as count 
                    FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'tbl_size' 
                    AND COLUMN_NAME = ?
                `, [col.name]);

                if (checkRows[0].count === 0) {
                    await promisePool.execute(`ALTER TABLE tbl_size ADD COLUMN ${col.name} ${col.type} AFTER name`);
                    console.log(`[PASS] Added column: ${col.name}`);
                } else {
                    console.log(`[SKIP] Column already exists: ${col.name}`);
                }
            } catch (err) {
                console.error(`[FAIL] Error processing column ${col.name}:`, err.message);
            }
        }
        console.log("Migration completed successfully.");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}

migrateSizeV2();
