const DatabaseUtils = require("../utils/database.utils");

class QCModel {
  static async _ensureSchema() {
    try {
      // Create QC Header table
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_qc (
          id INT AUTO_INCREMENT PRIMARY KEY,
          qcNo VARCHAR(50) NOT NULL UNIQUE,
          qcDate DATE NOT NULL,
          grnId INT NOT NULL,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'Completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (grnId) REFERENCES tbl_grn(id)
        )
      `);

      // Create QC Items table
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_qc_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          qcId INT NOT NULL,
          materialId INT,
          materialName VARCHAR(255),
          uomId INT,
          color VARCHAR(100),
          receivedQty DECIMAL(15,4) DEFAULT 0,
          acceptedQty DECIMAL(15,4) DEFAULT 0,
          rejectedQty DECIMAL(15,4) DEFAULT 0,
          FOREIGN KEY (qcId) REFERENCES tbl_qc(id) ON DELETE CASCADE
        )
      `);
      // Ensure columns exist for items (Migration)
      const qCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_qc_items");
      const qNames = qCols.map(c => c.Field.toLowerCase());
      if (!qNames.includes('materialname')) {
        await DatabaseUtils.query("ALTER TABLE tbl_qc_items ADD COLUMN materialName VARCHAR(255) AFTER materialId");
      }
      if (!qNames.includes('remarks')) {
        await DatabaseUtils.query("ALTER TABLE tbl_qc_items ADD COLUMN remarks TEXT AFTER rejectedQty");
      }
      if (!qNames.includes('rate')) {
        await DatabaseUtils.query("ALTER TABLE tbl_qc_items ADD COLUMN rate DECIMAL(15,4) DEFAULT 0 AFTER rejectedQty");
      }
    } catch (e) {
      console.error("❌ QC Schema Error:", e.message);
    }

    // 3. Inventory Schema Updates for Sales-Order-wise & QC items
    try {
      // Add columns to tbl_inventory
      const invCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_inventory");
      const invNames = invCols.map(c => c.Field);
      if (!invNames.includes('orderId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD COLUMN orderId INT AFTER color");
      }
      if (!invNames.includes('stockStatus')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD COLUMN stockStatus ENUM('Accepted', 'Rejected') DEFAULT 'Accepted' AFTER orderId");
      }

      // Ensure uomId exists (from previous models)
      if (!invNames.includes('uomId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD COLUMN uomId INT AFTER materialId");
      }

      // Update Unique Index in tbl_inventory
      const invIndexes = await DatabaseUtils.query("SHOW INDEX FROM tbl_inventory");
      const indexNames = invIndexes.map(i => i.Key_name);
      
      if (!indexNames.includes('idx_inventory_stock')) {
        // Drop any old nameless UNIQUE constraints that match the old pattern
        try {
          // Typically the first column name is used as the index name if none provided
          if (indexNames.includes('materialId')) await DatabaseUtils.query("ALTER TABLE tbl_inventory DROP INDEX materialId");
          if (indexNames.includes('materialId_2')) await DatabaseUtils.query("ALTER TABLE tbl_inventory DROP INDEX materialId_2");
        } catch(err) { /* ignore */ }

        await DatabaseUtils.query("ALTER TABLE tbl_inventory ADD UNIQUE KEY idx_inventory_stock (materialId, uomId, color, orderId, stockStatus)");
      }

      // Add columns to tbl_inventory_ledger
      const ledCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_inventory_ledger");
      const ledNames = ledCols.map(c => c.Field);
      if (!ledNames.includes('orderId')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD COLUMN orderId INT AFTER poNo");
      }
      if (!ledNames.includes('stockStatus')) {
        await DatabaseUtils.query("ALTER TABLE tbl_inventory_ledger ADD COLUMN stockStatus ENUM('Accepted', 'Rejected') DEFAULT 'Accepted' AFTER orderId");
      }
    } catch (e) {
      console.error("❌ Inventory Schema Migration Error:", e.message);
    }
  }

  static async generateNextCode() {
    await this._ensureSchema();
    const rows = await DatabaseUtils.query("SELECT qcNo FROM tbl_qc ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return "QC-0001";
    const lastCode = rows[0].qcNo;
    const lastNum = parseInt(lastCode.split("-")[1] || 0);
    return `QC-${String(lastNum + 1).padStart(4, "0")}`;
  }

  static async list(page = 1, limit = 10, searchTerm = "", type = "accepted", bomId = null) {
    await this._ensureSchema();
    let sql = `
      SELECT q.id as qcId, q.*, g.grnNo, g.poNo, g.supplierName, g.totalAmount, w.name as warehouseName,
             (SELECT SUM(qi2.acceptedQty) FROM tbl_qc_items qi2 WHERE qi2.qcId = q.id) as totalAccepted,
             (SELECT SUM(qi2.rejectedQty) FROM tbl_qc_items qi2 WHERE qi2.qcId = q.id) as totalRejected
      FROM tbl_qc q
      JOIN tbl_grn g ON q.grnId = g.id
      LEFT JOIN tbl_purchase_order po ON g.poNo = po.poNo
      LEFT JOIN tbl_warehouse w ON g.warehouseId = w.id
      WHERE 1=1
    `;

    if (type === 'accepted') {
      sql += " AND EXISTS (SELECT 1 FROM tbl_qc_items WHERE qcId = q.id AND acceptedQty > 0)";
    } else if (type === 'rejected') {
      sql += " AND EXISTS (SELECT 1 FROM tbl_qc_items WHERE qcId = q.id AND rejectedQty > 0)";
    }

    const params = [];

    if (bomId) {
      sql += " AND po.bomId = ?";
      params.push(bomId);
    }

    if (searchTerm) {
      sql += " AND (q.qcNo LIKE ? OR g.grnNo LIKE ? OR g.supplierName LIKE ?)";
      const term = `%${searchTerm}%`;
      params.push(term, term, term);
    }
    sql += " ORDER BY q.id DESC";
    
    const offset = (page - 1) * limit;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const rows = await DatabaseUtils.query(paginatedSql, [...params, limit, offset]);
    
    // Fetch items for each QC record for detailed exports/views
    for (let i = 0; i < rows.length; i++) {
      const qcId = rows[i].qcId || rows[i].id;
      const items = await DatabaseUtils.query(`
        SELECT 
          qi.*,
          COALESCE(NULLIF(qi.materialName, ''), m.name) as materialName, 
          u.name as uom
        FROM tbl_qc_items qi
        LEFT JOIN tbl_material m ON qi.materialId = m.id
        LEFT JOIN tbl_uom u ON qi.uomId = u.id
        WHERE qi.qcId = ?
      `, [qcId]);
      rows[i].items = items;
      rows[i].lines = items; // Provide alias for consistency with GRN
    }
    
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as t`;
    const countRows = await DatabaseUtils.query(countSql, params);
    
    return { list: rows, totalCount: countRows[0].total };
  }

  static async listBOMWise(page = 1, limit = 10, searchTerm = "", type = "accepted") {
    const offset = (page - 1) * limit;
    let whereClause = "1=1";
    let whereParams = [];

    if (searchTerm) {
      whereClause += " AND b.bomCode LIKE ?";
      whereParams.push(`%${searchTerm}%`);
    }

    if (type === 'accepted') {
      whereClause += " AND EXISTS (SELECT 1 FROM tbl_qc_items qi WHERE qi.qcId = q.id AND qi.acceptedQty > 0)";
    } else if (type === 'rejected') {
      whereClause += " AND EXISTS (SELECT 1 FROM tbl_qc_items qi WHERE qi.qcId = q.id AND qi.rejectedQty > 0)";
    }

    const sql = `
      SELECT b.id as bomId, b.bomCode as bomNo, a.name as articleName, COUNT(q.id) as lineCount
      FROM tbl_bom b
      JOIN tbl_article a ON b.articleId = a.id
      INNER JOIN tbl_purchase_order po ON b.id = po.bomId
      INNER JOIN tbl_grn g ON po.poNo = g.poNo
      INNER JOIN tbl_qc q ON g.id = q.grnId
      WHERE ${whereClause}
      GROUP BY b.id, b.bomCode, a.name
      ORDER BY b.bomCode ASC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM tbl_bom b
      INNER JOIN tbl_purchase_order po ON b.id = po.bomId
      INNER JOIN tbl_grn g ON po.poNo = g.poNo
      INNER JOIN tbl_qc q ON g.id = q.grnId
      WHERE ${whereClause}
    `;

    const [rows, countResult] = await Promise.all([
      DatabaseUtils.query(sql, [...whereParams, limit, offset]),
      DatabaseUtils.query(countSql, whereParams)
    ]);

    return {
      list: rows,
      totalCount: countResult[0]?.total || 0
    };
  }

  static async create(data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Trace OrderId (Sales Order) from GRN via PO/BOM
      const grnRows = await DatabaseUtils.query("SELECT poNo FROM tbl_grn WHERE id = ?", [data.grnId], connection);
      let orderId = null;
      if (grnRows.length > 0 && grnRows[0].poNo) {
        // Try header-level first
        const poRows = await DatabaseUtils.query("SELECT bomSectionId FROM tbl_purchase_order WHERE poNo = ?", [grnRows[0].poNo], connection);
        if (poRows.length > 0 && poRows[0].bomSectionId) {
          const sectionRows = await DatabaseUtils.query("SELECT orderId FROM tbl_bom_sections WHERE id = ?", [poRows[0].bomSectionId], connection);
          if (sectionRows.length > 0) orderId = sectionRows[0].orderId;
        }

        // Fallback to item-level tracking if header lookup failed
        if (!orderId) {
          const itemRows = await DatabaseUtils.query(`
            SELECT DISTINCT i.orderId 
            FROM tbl_purchase_order_items i
            JOIN tbl_purchase_order p ON i.poId = p.id
            WHERE p.poNo = ? AND i.orderId IS NOT NULL 
            LIMIT 1
          `, [grnRows[0].poNo], connection);
          if (itemRows.length > 0) orderId = itemRows[0].orderId;
        }
      }

      // 2. Insert QC Header
      const qcId = await DatabaseUtils.insert("tbl_qc", {
        qcNo: data.qcNo,
        qcDate: data.qcDate,
        grnId: data.grnId,
        remarks: data.remarks || null,
        status: 'Completed'
      }, connection);

      // 3. Process Items
      await this._processQCItems(qcId, data, orderId, connection);

      return qcId;
    });
  }

  static async update(id, data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Fetch existing QC to reverse impact
      const oldItems = await DatabaseUtils.query("SELECT * FROM tbl_qc_items WHERE qcId = ?", [id], connection);
      const qcRows = await DatabaseUtils.query("SELECT * FROM tbl_qc WHERE id = ?", [id], connection);
      if (qcRows.length === 0) throw new Error("QC record not found");
      const qc = qcRows[0];

      // Trace OrderId (same logic as create)
      const grnRows = await DatabaseUtils.query("SELECT poNo FROM tbl_grn WHERE id = ?", [qc.grnId], connection);
      let orderId = null;
      if (grnRows.length > 0 && grnRows[0].poNo) {
        // Try header-level first
        const poRows = await DatabaseUtils.query("SELECT bomSectionId FROM tbl_purchase_order WHERE poNo = ?", [grnRows[0].poNo], connection);
        if (poRows.length > 0 && poRows[0].bomSectionId) {
          const sectionRows = await DatabaseUtils.query("SELECT orderId FROM tbl_bom_sections WHERE id = ?", [poRows[0].bomSectionId], connection);
          if (sectionRows.length > 0) orderId = sectionRows[0].orderId;
        }

        // Fallback to item-level tracking if header lookup failed
        if (!orderId) {
          const itemRows = await DatabaseUtils.query(`
            SELECT DISTINCT i.orderId 
            FROM tbl_purchase_order_items i
            JOIN tbl_purchase_order p ON i.poId = p.id
            WHERE p.poNo = ? AND i.orderId IS NOT NULL 
            LIMIT 1
          `, [grnRows[0].poNo], connection);
          if (itemRows.length > 0) orderId = itemRows[0].orderId;
        }
      }

      // 2. Reverse Old Quantities
      for (const item of oldItems) {
        // Decrement qcQty in GRN
        await DatabaseUtils.query(`
          UPDATE tbl_grn_items 
          SET qcQty = qcQty - ? 
          WHERE grnId = ? 
            AND (material_id <=> ? OR (isManual = 1 AND materialName <=> ?))
            AND uom_id <=> ? 
            AND color <=> ?
        `, [Number(item.acceptedQty) + Number(item.rejectedQty), qc.grnId, item.materialId, item.materialName, item.uomId, item.color], connection);

        // Reverse Stock (Accepted)
        if (item.acceptedQty > 0 && item.materialId) {
          await DatabaseUtils.query(
            "UPDATE tbl_inventory SET quantity = quantity - ? WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ? AND stockStatus = 'Accepted'",
            [item.acceptedQty, item.materialId, item.uomId, item.color || '', orderId],
            connection
          );
        }

        // Reverse Stock (Rejected)
        if (item.rejectedQty > 0 && item.materialId) {
          await DatabaseUtils.query(
            "UPDATE tbl_inventory SET quantity = quantity - ? WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ? AND stockStatus = 'Rejected'",
            [item.rejectedQty, item.materialId, item.uomId, item.color || '', orderId],
            connection
          );
        }
      }

      // 3. Delete old items
      await DatabaseUtils.query("DELETE FROM tbl_qc_items WHERE qcId = ?", [id], connection);

      // 4. Update Header
      await DatabaseUtils.query("UPDATE tbl_qc SET qcDate = ?, remarks = ? WHERE id = ?", [data.qcDate, data.remarks, id], connection);

      // 5. Process New Items
      await this._processQCItems(id, data, orderId, connection);

      return id;
    });
  }

  static async _processQCItems(qcId, data, orderId, connection) {
    const items = data.items || data.lines || [];
    for (const line of items) {
      const acceptedQty = Math.round(Number(line.acceptedQty || 0) * 10000) / 10000;
      const rejectedQty = Math.round(Number(line.rejectedQty || 0) * 10000) / 10000;
      const receivedQty = Math.round(Number(line.receivedQty || 0) * 10000) / 10000;

      const mId = line.materialId || null;
      const uId = line.uomId || null;
      const mName = line.materialName || null;

      // Validation: New Total Inspected (this session + previous)
      const checkItem = await DatabaseUtils.query(`
        SELECT receivedQty, qcQty, isManual, materialName, orderId FROM tbl_grn_items 
        WHERE grnId = ? 
          AND (material_id <=> ? OR (isManual = 1 AND materialName <=> ?))
          AND uom_id <=> ? 
          AND color <=> ?
      `, [data.grnId, mId, mName, uId, line.color], connection);

      let itemOrderId = orderId; // Default to header-level argument
      if (checkItem.length > 0) {
        const { receivedQty: totalReceived, qcQty: existingQc, orderId: grnItemId } = checkItem[0];
        
        // Use item-level orderId from GRN if available
        if (grnItemId) itemOrderId = grnItemId;

        if (Number(existingQc) + acceptedQty + rejectedQty > Number(totalReceived) + 0.0001) {
          throw new Error(`Quantity exceeded for ${line.materialName}. Max remaining: ${Number(totalReceived) - Number(existingQc)}`);
        }
      }

      await DatabaseUtils.insert("tbl_qc_items", {
        qcId,
        orderId: itemOrderId, // Track SO
        materialId: line.materialId,
        materialName: line.materialName,
        uomId: line.uomId,
        color: line.color,
        receivedQty,
        acceptedQty,
        rejectedQty,
        rate: Number(line.rate || 0),
        remarks: line.remarks || null
      }, connection);

      // Update Cumulative QC Quantity in GRN Items
      await DatabaseUtils.query(`
        UPDATE tbl_grn_items 
        SET qcQty = qcQty + ? 
        WHERE grnId = ? 
          AND (material_id <=> ? OR (isManual = 1 AND materialName <=> ?))
          AND uom_id <=> ? 
          AND color <=> ?
      `, [acceptedQty + rejectedQty, data.grnId, mId, mName, uId, line.color], connection);

      // Update Accepted Stock
      if (acceptedQty > 0 && line.materialId) {
        await this._updateStock(
          line.materialId, 
          line.uomId, 
          line.color, 
          acceptedQty, 
          qcId, 
          data.qcNo, 
          data.grnId,
          itemOrderId,
          'Accepted',
          connection
        );
      }

      // Update Rejected Stock
      if (rejectedQty > 0 && line.materialId) {
        await this._updateStock(
          line.materialId, 
          line.uomId, 
          line.color, 
          rejectedQty, 
          qcId, 
          data.qcNo, 
          data.grnId,
          itemOrderId,
          'Rejected',
          connection
        );
      }
    }

    // Update GRN status based on cumulative QC progress
    const allGrnItems = await DatabaseUtils.query(`
      SELECT SUM(receivedQty) as totalReceived, SUM(qcQty) as totalInspected
      FROM tbl_grn_items WHERE grnId = ?
    `, [data.grnId], connection);
    
    let finalStatus = 'Partial QC';
    if (allGrnItems.length > 0) {
      const { totalReceived, totalInspected } = allGrnItems[0];
      if (Number(totalInspected) >= Number(totalReceived)) {
        finalStatus = 'QC Completed';
      }
    }
    await DatabaseUtils.query("UPDATE tbl_grn SET status = ? WHERE id = ?", [finalStatus, data.grnId], connection);
  }

  static async _updateStock(materialId, uomId, color, qtyChange, qcId, qcNo, grnId, orderId, stockStatus, connection) {
    // 1. Update Physical Stock in tbl_inventory (Sales-Order & Status wise)
    const rows = await DatabaseUtils.query(
      "SELECT id, quantity FROM tbl_inventory WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ? AND stockStatus = ?",
      [materialId, uomId, color || '', orderId, stockStatus],
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
        orderId: orderId,
        stockStatus: stockStatus,
        quantity: qtyChange
      }, connection);
    }

    // 2. Add to Inventory Ledger
    await DatabaseUtils.insert("tbl_inventory_ledger", {
      materialId,
      uomId,
      color: color || '',
      grnId: grnId || null, 
      orderId: orderId,
      stockStatus: stockStatus,
      quantity: Math.abs(qtyChange),
      transactionType: 'IN',
      remarks: `QC-${qcNo} (${stockStatus}): Stock added after inspection`
    }, connection);
  }

  static async getById(id) {
    await this._ensureSchema();
    const header = await DatabaseUtils.query(`
      SELECT q.*, g.grnNo, g.poNo, g.supplierName, g.totalAmount, w.name as warehouseName 
      FROM tbl_qc q
      JOIN tbl_grn g ON q.grnId = g.id
      LEFT JOIN tbl_warehouse w ON g.warehouseId = w.id
      WHERE q.id = ?
    `, [id]);
    
    if (header.length === 0) return null;
    
    const items = await DatabaseUtils.query(`
      SELECT 
        qi.id, qi.qcId, qi.materialId, qi.uomId, qi.color, 
        qi.receivedQty, qi.acceptedQty, qi.rejectedQty, qi.rate, qi.remarks,
        COALESCE(NULLIF(qi.materialName, ''), m.name) as materialName, 
        u.name as uom
      FROM tbl_qc_items qi
      LEFT JOIN tbl_material m ON qi.materialId = m.id
      LEFT JOIN tbl_uom u ON qi.uomId = u.id
      WHERE qi.qcId = ?
    `, [id]);
    
    return { ...header[0], items: items };
  }

  static async delete(id) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Fetch QC record with items for reversal
      const headerRows = await DatabaseUtils.query(`
        SELECT q.*, g.grnNo FROM tbl_qc q
        JOIN tbl_grn g ON q.grnId = g.id
        WHERE q.id = ?
      `, [id], connection);

      if (headerRows.length === 0) throw new Error("QC Record not found");
      const qc = headerRows[0];

      // Trace OrderId (same logic as create)
      const poRows = await DatabaseUtils.query("SELECT bomSectionId FROM tbl_purchase_order WHERE poNo = ?", [qc.grnNo], connection);
      let orderId = null;
      if (poRows.length > 0 && poRows[0].bomSectionId) {
        const sectionRows = await DatabaseUtils.query("SELECT orderId FROM tbl_bom_sections WHERE id = ?", [poRows[0].bomSectionId], connection);
        if (sectionRows.length > 0) orderId = sectionRows[0].orderId;
      }

      const itemRows = await DatabaseUtils.query(`
        SELECT * FROM tbl_qc_items WHERE qcId = ?
      `, [id], connection);

      // 2. Reverse Stock
      for (const item of itemRows) {
        const itemOrderId = item.orderId || null;

        // Reverse Accepted Stock
        if (item.acceptedQty > 0 && item.materialId) {
          await DatabaseUtils.query(
            "UPDATE tbl_inventory SET quantity = quantity - ? WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ? AND stockStatus = 'Accepted'",
            [item.acceptedQty, item.materialId, item.uomId, item.color || '', itemOrderId],
            connection
          );

          await DatabaseUtils.insert("tbl_inventory_ledger", {
            materialId: item.materialId,
            uomId: item.uomId,
            color: item.color || '',
            grnId: qc.grnId,
            orderId: itemOrderId,
            stockStatus: 'Accepted',
            quantity: item.acceptedQty,
            transactionType: 'OUT',
            remarks: `QC-${qc.qcNo} Deleted: Inspection reversal (Accepted)`
          }, connection);
        }

        // Reverse Rejected Stock
        if (item.rejectedQty > 0 && item.materialId) {
          await DatabaseUtils.query(
            "UPDATE tbl_inventory SET quantity = quantity - ? WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ? AND stockStatus = 'Rejected'",
            [item.rejectedQty, item.materialId, item.uomId, item.color || '', itemOrderId],
            connection
          );

          await DatabaseUtils.insert("tbl_inventory_ledger", {
            materialId: item.materialId,
            uomId: item.uomId,
            color: item.color || '',
            grnId: qc.grnId,
            orderId: itemOrderId,
            stockStatus: 'Rejected',
            quantity: item.rejectedQty,
            transactionType: 'OUT',
            remarks: `QC-${qc.qcNo} Deleted: Inspection reversal (Rejected)`
          }, connection);
        }
      }

      // 3. Update GRN status and quantities
      for (const item of itemRows) {
        // Decrement qcQty in GRN items
        await DatabaseUtils.query(`
          UPDATE tbl_grn_items 
          SET qcQty = qcQty - ? 
          WHERE grnId = ? AND material_id = ? AND uom_id = ? AND color = ?
        `, [Number(item.acceptedQty) + Number(item.rejectedQty), qc.grnId, item.materialId, item.uomId, item.color || ''], connection);
      }

      const checkItems = await DatabaseUtils.query(`
        SELECT SUM(qcQty) as totalInspected FROM tbl_grn_items WHERE grnId = ?
      `, [qc.grnId], connection);
      
      const totalInspected = Number(checkItems[0]?.totalInspected || 0);
      let newHeaderStatus = totalInspected > 0 ? 'Partial QC' : 'Received';

      await DatabaseUtils.query("UPDATE tbl_grn SET status = ? WHERE id = ?", [newHeaderStatus, qc.grnId], connection);

      // 4. Delete QC Header (items follow via cascade)
      await DatabaseUtils.query("DELETE FROM tbl_qc WHERE id = ?", [id], connection);

      return true;
    });
  }
}

module.exports = QCModel;
