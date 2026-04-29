const mysql = require("mysql2/promise");
require("dotenv").config();

async function updateEnums() {
    const dbConfig = { host: process.env.DB_HOST || "localhost", user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "", database: process.env.DB_NAME || "erp_system" };
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Get current enum for tbl_attachmentdetails.type
        const [rows1] = await connection.execute("SHOW COLUMNS FROM tbl_attachmentdetails LIKE 'type'");
        let currentTypeEnum = rows1[0].Type; // e.g. enum('a','b')
        if (!currentTypeEnum.includes("'articleImage'")) {
            const newTypeEnum = currentTypeEnum.replace(")", ",'articleImage','article')");
            await connection.execute(`ALTER TABLE tbl_attachmentdetails MODIFY COLUMN type ${newTypeEnum}`);
            console.log("Updated tbl_attachmentdetails.type enum");
        }

        // Get current enum for tbl_entityattachment.entityType
        const [rows2] = await connection.execute("SHOW COLUMNS FROM tbl_entityattachment LIKE 'entityType'");
        let currentEntityTypeEnum = rows2[0].Type;
        if (!currentEntityTypeEnum.includes("'articleImage'")) {
            const newEntityEnum = currentEntityTypeEnum.replace(")", ",'articleImage','article')");
            await connection.execute(`ALTER TABLE tbl_entityattachment MODIFY COLUMN entityType ${newEntityEnum}`);
            console.log("Updated tbl_entityattachment.entityType enum");
        }

        await connection.end();
    } catch (e) { 
        console.error("Manual fallback if regex fails:");
        console.error(e); 
    }
}
updateEnums();
