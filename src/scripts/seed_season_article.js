const mysql = require("mysql2/promise");
require("dotenv").config();

async function createSeasonTable() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "backend" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tbl_season (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) UNIQUE,
                status ENUM('Active', 'Inactive', 'Deleted') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log("tbl_season ensured!");
        
        const seasons = ['Winter', 'Summer', 'Rain'];
        for (const s of seasons) {
            try {
                await connection.execute(`INSERT INTO tbl_season (name) VALUES (?)`, [s]);
            } catch(e) {}
        }
        console.log("Seasons seeded!");

        // Also ensure tbl_article is updated with new fields
        await connection.execute(`
            ALTER TABLE tbl_article 
            ADD COLUMN IF NOT EXISTS itemGroup VARCHAR(100),
            ADD COLUMN IF NOT EXISTS sizeGroup VARCHAR(100),
            ADD COLUMN IF NOT EXISTS season VARCHAR(100),
            ADD COLUMN IF NOT EXISTS image TEXT,
            ADD COLUMN IF NOT EXISTS exchangeDate DATE,
            ADD COLUMN IF NOT EXISTS currency VARCHAR(20) DEFAULT 'INR'
        `);
        console.log("tbl_article updated with new fields!");

        await connection.end();
    } catch (e) { console.error(e); }
}
createSeasonTable();
