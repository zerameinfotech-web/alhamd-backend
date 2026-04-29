const app = require("./src/app");
const { testConnection } = require("./src/config/database");
const fs = require("fs");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

// const runMigrations = async () => {
//   const { promisePool } = require("./src/config/database");
//   console.log("🛠️  Running database migrations (Snake Case & Normalization)...");

//   try {
//     // Diagnostic: Log current columns in tbl_size
//     try {
//       const [cols] = await promisePool.execute("SHOW COLUMNS FROM tbl_size");
//       console.log("📊 Current tbl_size columns:", cols.map(c => c.Field).join(", "));
//     } catch (e) {
//       console.log("📊 [INFO] Could not fetch columns for diagnostic:", e.message);
//     }

//     // 1. Standardize tbl_size (Master) 
//     const columns = [
//       { name: 'sizeGroup', type: 'VARCHAR(100)' },
//       { name: 'sizeFrom', type: 'VARCHAR(50)' },
//       { name: 'sizeTo', type: 'VARCHAR(50)' },
//       { name: 'gender', type: 'VARCHAR(50)' },
//       { name: 'sizeType', type: 'VARCHAR(50)' },
//       { name: 'widthType', type: 'VARCHAR(50)' },
//       { name: 'status', type: "VARCHAR(20) DEFAULT 'Active'" }
//     ];

//     for (const col of columns) {
//       try {
//         await promisePool.execute(`ALTER TABLE tbl_size ADD COLUMN ${col.name} ${col.type} AFTER name`);
//         console.log(`[PASS] Added column ${col.name} to tbl_size.`);
//       } catch (e) {
//         // If it's "Duplicate column name" (Error 1060), we skip it silently
//         if (e.errno !== 1060) {
//           console.error(`[INFO] Column ${col.name} note: ${e.message}`);
//         }
//       }
//     }

//     // 2. DROP UNUSED/LEGACY COLUMNS (Cleanup)
//     const columnsToDrop = ['value', 'name', 'sizeLength', 'createdAt', 'updatedAt', 'deletedAt'];
//     console.log("🧹 Attempting to drop legacy columns:", columnsToDrop.join(", "));

//     for (const col of columnsToDrop) {
//       try {
//         await promisePool.execute(`ALTER TABLE \`tbl_size\` DROP COLUMN \`${col}\``);
//         console.log(`[PASS] Dropped legacy column: ${col}`);
//       } catch (e) {
//         // Error 1091: Column doesn't exist (silent skip)
//         if (e.errno === 1091) {
//           // console.log(`[INFO] Column ${col} already removed.`);
//         } else {
//           console.error(`[FAIL] Could not drop column ${col}:`, e.message);
//         }
//       }
//     }

//     // Post-cleanup diagnostic
//     try {
//       const [finalCols] = await promisePool.execute("SHOW COLUMNS FROM tbl_size");
//       console.log("✅ Final tbl_size columns:", finalCols.map(c => c.Field).join(", "));
//     } catch (e) {}

//     // 2. Ensure snake_case timestamp columns in tbl_size
//     const timestamps = ['created_at', 'updated_at', 'deleted_at'];
//     for (const ts of timestamps) {
//         try {
//             const [check] = await promisePool.execute(`
//                 SELECT COUNT(*) as count 
//                 FROM information_schema.COLUMNS 
//                 WHERE TABLE_SCHEMA = DATABASE() 
//                 AND TABLE_NAME = 'tbl_size' 
//                 AND COLUMN_NAME = ?
//             `, [ts]);
//             if (check[0].count === 0) {
//                 const query = ts === 'created_at' 
//                     ? `ALTER TABLE tbl_size ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
//                     : ts === 'updated_at'
//                     ? `ALTER TABLE tbl_size ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
//                     : `ALTER TABLE tbl_size ADD COLUMN deleted_at TIMESTAMP NULL`;
//                 await promisePool.execute(query);
//                 console.log(`[PASS] Added timestamp column: ${ts}`);
//             }
//         } catch (e) {
//             console.error(`[FAIL] Timestamp column ${ts}:`, e.message);
//         }
//     }

//     // 3. Drop unique index on code in tbl_size
//     try {
//       await promisePool.execute(`ALTER TABLE tbl_size DROP INDEX code`);
//       console.log("[PASS] Dropped unique index 'code' in tbl_size.");
//     } catch (e) {
//       console.log(`[INFO] Index 'code' drop skipped: ${e.message}`);
//     }

//     // 4. Ensure tbl_size_details is correctly structured with snake_case timestamps
//     await promisePool.execute(`
//       CREATE TABLE IF NOT EXISTS tbl_size_details (
//         id INT AUTO_INCREMENT PRIMARY KEY,
//         groupId INT,
//         name VARCHAR(50),
//         sortOrder INT DEFAULT 0
//       )
//     `);

//     const detailTimestamps = ['created_at', 'updated_at', 'deleted_at'];
//     for (const ts of detailTimestamps) {
//         try {
//             const [check] = await promisePool.execute(`
//                 SELECT COUNT(*) as count 
//                 FROM information_schema.COLUMNS 
//                 WHERE TABLE_SCHEMA = DATABASE() 
//                 AND TABLE_NAME = 'tbl_size_details' 
//                 AND COLUMN_NAME = ?
//             `, [ts]);
//             if (check[0].count === 0) {
//                 const query = ts === 'created_at' 
//                     ? `ALTER TABLE tbl_size_details ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
//                     : ts === 'updated_at'
//                     ? `ALTER TABLE tbl_size_details ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
//                     : `ALTER TABLE tbl_size_details ADD COLUMN deleted_at TIMESTAMP NULL`;
//                 await promisePool.execute(query);
//                 console.log(`[PASS] Added timestamp column ${ts} to tbl_size_details.`);
//             }
//         } catch (e) {
//             console.error(`[FAIL] Detail timestamp column ${ts}:`, e.message);
//         }
//     }
//     console.log("[PASS] Table tbl_size_details structure ensured.");

//   } catch (err) {
//     console.error("❌ Migration error:", err.message);
//   }

//     // 4. Ensure tbl_orders has orderName column
//     try {
//       await promisePool.execute(`ALTER TABLE tbl_orders ADD COLUMN orderName VARCHAR(255) AFTER orderCode`);
//       console.log("[PASS] Added orderName column to tbl_orders.");
//     } catch (e) {
//       if (e.errno !== 1060) {
//         console.error(`[INFO] tbl_orders column note: ${e.message}`);
//       }
//     }

//     // 5. DATA FIX: Ensure correct sizeType from group name (Fixing "CM" showing instead of "UK")
//     try {
//         console.log("🧹 Running sizeType data fix...");
//         await promisePool.execute(`
//             UPDATE tbl_size 
//             SET sizeType = 'UK' 
//             WHERE sizeGroup LIKE '%-UK-%' AND (sizeType IS NULL OR sizeType != 'UK')
//         `);
//         await promisePool.execute(`
//             UPDATE tbl_size 
//             SET sizeType = 'EU' 
//             WHERE sizeGroup LIKE '%-EU-%' AND (sizeType IS NULL OR sizeType != 'EU')
//         `);
//         await promisePool.execute(`
//             UPDATE tbl_size 
//             SET sizeType = 'US' 
//             WHERE sizeGroup LIKE '%-US-%' AND (sizeType IS NULL OR sizeType != 'US')
//         `);
//         console.log("✅ sizeType data fix completed.");
//     } catch (e) {
//         console.error("❌ Data fix error:", e.message);
//     }

//     console.log("✅ Database migrations completed.");
// };

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    console.log("✅ Database connection successful");

    // Start migrations
    // await runMigrations();

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }

    // Start server
    app.listen(PORT, async () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);

      // Diagnostic: Confirm tbl_orders has orderName
      // try {
      //   const [cols] = await promisePool.execute("SHOW COLUMNS FROM tbl_orders");
      //   const hasOrderName = cols.some(c => c.Field === 'orderName');
      //   console.log("📊 tbl_orders columns check:", hasOrderName ? "✅ orderName exists" : "❌ orderName MISSING");
      // } catch (e) {
      //   console.error("📊 Table check error:", e.message);
      // }
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
