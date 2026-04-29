const DatabaseUtils = require("../utils/database.utils");

class InventoryModel {
  static async _ensureSchema() {
    try {
      // 1. Physical Stock Table (Aggregated)
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_inventory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          materialId INT NOT NULL,
          uomId INT NOT NULL,
          color VARCHAR(100),
          orderId INT,
          warehouseId INT,
          stockStatus VARCHAR(50) DEFAULT 'Accepted',
          quantity DECIMAL(15,2) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY (materialId, uomId, color, orderId, warehouseId, stockStatus)
        )
      `);

      // Force updates on existing tables
      const invCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_inventory");
      const invNames = invCols.map(c => c.Field);
      if (!invNames.includes('orderId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD orderId INT AFTER color");
      }
      if (!invNames.includes('stockStatus')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD stockStatus VARCHAR(50) DEFAULT 'Accepted' AFTER orderId");
      }
      if (!invNames.includes('warehouseId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD warehouseId INT AFTER orderId");
      }

      // Check unique key and update if needed
      const invIndices = await DatabaseUtils.query("SHOW INDEX FROM tbl_inventory");
      const hasOldKey = invIndices.some(idx => idx.Key_name === 'materialId' || (idx.Non_unique === 0 && idx.Column_name === 'materialId' && invIndices.filter(i => i.Key_name === idx.Key_name).length === 3));
      
      if (hasOldKey) {
          // Find the name of the unique key covering (materialId, uomId, color)
          const keyName = invIndices.find(idx => idx.Column_name === 'materialId' && idx.Non_unique === 0)?.Key_name;
          if (keyName && keyName !== 'PRIMARY') {
              try {
                  await DatabaseUtils.query(`ALTER TABLE tbl_inventory DROP INDEX ${keyName}`);
              } catch (e) {
                  console.log("Index drop failed (maybe already gone)");
              }
          }
          // Add New unique key
          try {
              await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD UNIQUE KEY (materialId, uomId, color, orderId, warehouseId, stockStatus)");
          } catch (e) {
              console.log("New index add failed (maybe already there)");
          }
      }

      // 2. Inventory Ledger (Transaction History)
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_inventory_ledger (
          id INT AUTO_INCREMENT PRIMARY KEY,
          materialId INT NOT NULL,
          uomId INT NOT NULL,
          color VARCHAR(100),
          grnId INT,
          qcId INT,
          orderId INT,
          warehouseId INT,
          stockStatus VARCHAR(50),
          poNo VARCHAR(50),
          quantity DECIMAL(15,2) NOT NULL,
          transactionType ENUM('IN', 'OUT') DEFAULT 'IN',
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      const ledgerCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_inventory_ledger");
      const ledgerNames = ledgerCols.map(c => c.Field);
      if (!ledgerNames.includes('orderId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD orderId INT AFTER grnId");
      }
      if (!ledgerNames.includes('qcId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD qcId INT AFTER grnId");
      }
      if (!ledgerNames.includes('stockStatus')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD stockStatus VARCHAR(50) AFTER orderId");
      }
      if (!ledgerNames.includes('warehouseId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD warehouseId INT AFTER orderId");
      }
    } catch (e) {
      console.error("❌ Inventory Schema Error:", e.message);
    }
  }

  static async list(page = 1, limit = 10, searchTerm = "", mode = 'all', orderId = null) {
    await this._ensureSchema();
    let whereClause = "i.stockStatus = 'Accepted'";
    let whereParams = [];

    if (mode === 'so') {
      whereClause += " AND i.orderId IS NOT NULL AND i.orderId != 0";
    } else if (mode === 'warehouse') {
      whereClause += " AND (i.orderId IS NULL OR i.orderId = 0)";
    }

    if (mode === 'so' && orderId) {
      whereClause += " AND i.orderId = ?";
      whereParams.push(Number(orderId));
    }

    if (searchTerm) {
      whereClause += " AND (m.name LIKE ? OR u.name LIKE ? OR i.color LIKE ? OR o.orderCode LIKE ?)";
      const pattern = `%${searchTerm}%`;
      whereParams.push(pattern, pattern, pattern, pattern);
    }

    return await DatabaseUtils.selectPaginated(
      "tbl_inventory i " +
      "JOIN tbl_material m ON i.materialId = m.id " + 
      "JOIN tbl_uom u ON i.uomId = u.id " +
      "LEFT JOIN tbl_orders o ON i.orderId = o.id " +
      "LEFT JOIN tbl_warehouse w ON i.warehouseId = w.id",
      "i.*, m.name as materialName, u.name as uomName, o.orderCode, w.name as warehouseName",
      whereClause,
      whereParams,
      page,
      limit,
      "i.quantity DESC"
    );
  }

  static async getWarehouseBreakdown(materialId, uomId, color) {
    return await DatabaseUtils.query(
      `SELECT w.name as warehouseName, SUM(i.quantity) as availableQty
       FROM tbl_inventory i
       LEFT JOIN tbl_warehouse w ON i.warehouseId = w.id
       WHERE i.materialId = ? AND i.uomId = ? AND i.color = ? 
       AND (i.orderId IS NULL OR i.orderId = 0 OR i.orderId = '')
       AND i.stockStatus = 'Accepted'
       GROUP BY w.id, w.name
       HAVING availableQty > 0
       ORDER BY w.name ASC`,
      [materialId, uomId, color || '']
    );
  }

  static async getHistory(materialId, uomId, color, orderId = null, stockStatus = 'Accepted') {
    return await DatabaseUtils.query(
      `SELECT il.quantity as qty, il.transactionType as type, il.poNo, il.created_at as date, 
              il.remarks, g.grnNo as referenceNo, g.supplierName, o.orderCode, w.name as warehouseName
       FROM tbl_inventory_ledger il
       LEFT JOIN tbl_grn g ON il.grnId = g.id
       LEFT JOIN tbl_orders o ON il.orderId = o.id
       LEFT JOIN tbl_warehouse w ON il.warehouseId = w.id
       WHERE il.materialId = ? AND il.uomId = ? AND il.color = ? AND il.orderId <=> ? AND il.stockStatus <=> ?
       ORDER BY il.created_at DESC`,
      [materialId, uomId, color || '', orderId, stockStatus]
    );
  }

  static async updateStock(materialId, uomId, color, qtyChange, refId, poNo, connection, type = 'IN', remarks = 'Inventory Update') {
    // 1. Update Physical Stock
    const rows = await DatabaseUtils.query(
      "SELECT id, quantity FROM tbl_inventory WHERE materialId = ? AND uomId = ? AND color = ?",
      [materialId, uomId, color || ''],
      connection
    );

    if (rows.length > 0) {
      await DatabaseUtils.query(
        "UPDATE tbl_inventory SET quantity = quantity + ? WHERE id = ?",
        [qtyChange, rows[0].id],
        connection
      );
    } else {
      await DatabaseUtils.insert("tbl_inventory", {
        materialId,
        uomId,
        color: color || '',
        quantity: qtyChange
      }, connection);
    }

    // 2. Insert into Ledger for Audit/History
    await DatabaseUtils.insert("tbl_inventory_ledger", {
      materialId,
      uomId,
      color: color || '',
      grnId: refId || null, // Shared column for references
      poNo,
      quantity: Math.abs(qtyChange),
      transactionType: type,
      remarks
    }, connection);
  }

  static async transferToWarehouse(materialId, uomId, color, orderId, quantity, warehouseId) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Check if SO stock exists
      const [soStock] = await DatabaseUtils.query(
        "SELECT id, quantity FROM tbl_inventory WHERE materialId = ? AND uomId = ? AND color = ? AND orderId = ? AND stockStatus = 'Accepted'",
        [materialId, uomId, color, orderId],
        connection
      );

      if (!soStock || Number(soStock.quantity) < Number(quantity)) {
        throw new Error(`Insufficient quantity in Sales Order stock. (Available: ${soStock?.quantity || 0})`);
      }

      // 2. Decrease SO stock
      await DatabaseUtils.query(
        "UPDATE tbl_inventory SET quantity = quantity - ? WHERE id = ?",
        [quantity, soStock.id],
        connection
      );

      // 3. Increase Warehouse (General) stock
      const [whStock] = await DatabaseUtils.query(
        "SELECT id FROM tbl_inventory WHERE materialId = ? AND uomId = ? AND color = ? AND warehouseId = ? AND (orderId IS NULL OR orderId = 0) AND stockStatus = 'Accepted'",
        [materialId, uomId, color, warehouseId],
        connection
      );

      if (whStock) {
        await DatabaseUtils.query("UPDATE tbl_inventory SET quantity = quantity + ? WHERE id = ?", [quantity, whStock.id], connection);
      } else {
        await DatabaseUtils.insert("tbl_inventory", {
          materialId,
          uomId,
          color: color || '',
          orderId: null,
          warehouseId: warehouseId,
          stockStatus: 'Accepted',
          quantity: quantity
        }, connection);
      }

      // 4. Ledger entries
      await DatabaseUtils.insert("tbl_inventory_ledger", {
        materialId,
        uomId,
        color: color || '',
        orderId: orderId,
        stockStatus: 'Accepted',
        quantity: quantity,
        transactionType: 'OUT',
        remarks: 'Transferred to General Warehouse Stock'
      }, connection);

      await DatabaseUtils.insert("tbl_inventory_ledger", {
        materialId,
        uomId,
        color: color || '',
        orderId: null,
        warehouseId: warehouseId,
        stockStatus: 'Accepted',
        quantity: quantity,
        transactionType: 'IN',
        remarks: `Obtained from Sales Order Stock (Original SO Order ID: ${orderId})`
      }, connection);

      return true;
    });
  }
}

module.exports = InventoryModel;
