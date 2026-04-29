require("dotenv").config({ path: __dirname + "/../../.env" });
const { promisePool } = require("../config/database");

const COLOUR_CATEGORY_OPTIONS = [
    { label: 'Dark', value: 'Dark' },
    { label: 'Light', value: 'Light' },
    { label: 'Neutral', value: 'Neutral' },
];

const FINISH_TYPE_OPTIONS = [
    { label: 'Matte', value: 'Matte' },
    { label: 'Glossy', value: 'Glossy' },
    { label: 'Textured', value: 'Textured' },
    { label: 'Semi-glossy', value: 'Semi-glossy' },
];

const COLOUR_GROUP_OPTIONS = [
    { label: 'Black Family', value: 'Black Family' },
    { label: 'Brown Family', value: 'Brown Family' },
    { label: 'Custom Shade', value: 'Custom Shade' },
    { label: 'White/Cream', value: 'White/Cream' },
    { label: 'Multi Colour', value: 'Multi Colour' },
];

async function seed() {
    try {
        console.log("Creating tables...");
        await promisePool.query(`CREATE TABLE IF NOT EXISTS tbl_colour_category (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE,
            status VARCHAR(50) DEFAULT 'Active'
        )`);

        await promisePool.query(`CREATE TABLE IF NOT EXISTS tbl_finish_type (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE,
            status VARCHAR(50) DEFAULT 'Active'
        )`);

        await promisePool.query(`CREATE TABLE IF NOT EXISTS tbl_colour_group (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE,
            status VARCHAR(50) DEFAULT 'Active'
        )`);

        console.log("Seeding tbl_colour_category...");
        for (const cat of COLOUR_CATEGORY_OPTIONS) {
            await promisePool.query(`INSERT IGNORE INTO tbl_colour_category (name) VALUES (?)`, [cat.label]);
        }

        console.log("Seeding tbl_finish_type...");
        for (const fin of FINISH_TYPE_OPTIONS) {
            await promisePool.query(`INSERT IGNORE INTO tbl_finish_type (name) VALUES (?)`, [fin.label]);
        }

        console.log("Seeding tbl_colour_group...");
        for (const grp of COLOUR_GROUP_OPTIONS) {
            await promisePool.query(`INSERT IGNORE INTO tbl_colour_group (name) VALUES (?)`, [grp.label]);
        }

        console.log("Colour lookups seeding completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Seed error:", err);
        process.exit(1);
    }
}

seed();
