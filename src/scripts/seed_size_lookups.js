const mysql = require("mysql2/promise");
require("dotenv").config();
const { TABLES } = require("../config/constants");

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "erp_system",
};

const createTables = [
    `CREATE TABLE IF NOT EXISTS ${TABLES.SIZE_TYPE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ${TABLES.SIZE_GENDER} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ${TABLES.SIZE_GROUP} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
];

const sizeTypes = ["UK", "US", "EU", "CM", "Standard"];
const genders = ["Men", "Women", "Kids", "Unisex"];
const sizeGroups = ["Apparel", "Footwear", "Accessories"];

async function seed() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected to database");

        for (const query of createTables) {
            await connection.execute(query);
        }
        console.log("Size lookup tables ensured");

        for (const name of sizeTypes) {
            await connection.execute(
                `INSERT IGNORE INTO ${TABLES.SIZE_TYPE} (name) VALUES (?)`,
                [name]
            );
        }
        for (const name of genders) {
            await connection.execute(
                `INSERT IGNORE INTO ${TABLES.SIZE_GENDER} (name) VALUES (?)`,
                [name]
            );
        }
        for (const name of sizeGroups) {
            await connection.execute(
                `INSERT IGNORE INTO ${TABLES.SIZE_GROUP} (name) VALUES (?)`,
                [name]
            );
        }
        console.log("Size lookups seeded successfully!");
    } catch (error) {
        console.error("Seeding failed:", error);
    } finally {
        if (connection) {
            await connection.end();
            console.log("Database connection closed.");
        }
        process.exit();
    }
}

seed();
