const mysql = require("mysql2/promise");
require("dotenv").config();

async function seedData() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Seed Supplier Types from image
        const types = [
            'Leather Supplier',
            'Synthetic Supplier',
            'Lining Supplier',
            'Chemical Supplier',
            'Accessories Supplier',
            'Packing Material Supplier'
        ];
        // Clean existing or at least insert new ones
        for (const t of types) {
            try {
                await connection.execute(`INSERT INTO tbl_supplier_type (name, status) VALUES (?, 'Active')`, [t]);
            } catch(e) {}
        }
        console.log("Seeded supplier types from image");

        // Seed Payment Terms from image
        const terms = [
            'Payment 30% Advance, 70% remaining',
            '30 Days',
            '45 Days',
            '60 Days',
            '90 Days',
            'LC (Letter of Credit)'
        ];
        for (const t of terms) {
            try {
                await connection.execute(`INSERT INTO tbl_payment_terms (name, status) VALUES (?, 'Active')`, [t]);
            } catch(e) {}
        }
        console.log("Seeded payment terms from image");

        // Ensure currencies match what the UI expects
        // If the user wants a dropdown of currencies, ensure we have the common ones
        const currencies = [
            ['INR', 'Indian Rupee', '₹'],
            ['USD', 'US Dollar', '$'],
            ['EUR', 'Euro', '€'],
            ['GBP', 'British Pound', '£']
        ];
        for (const [code, name, symbol] of currencies) {
            try {
                await connection.execute(`INSERT INTO tbl_currency (code, name, symbol, status) VALUES (?, ?, ?, 'Active')`, [code, name, symbol]);
            } catch(e) {}
        }
        console.log("Seeded common currencies");

        await connection.end();
    } catch (e) { console.error(e); }
}
seedData();
