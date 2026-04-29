const DatabaseUtils = require("../utils/database.utils");

class GRNModel {
  static async _ensureSchema() {
    try {
      // Create Header Table
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_grn (
          id INT AUTO_INCREMENT PRIMARY KEY,
          grnNo VARCHAR(50) NOT NULL UNIQUE,
          grnDate DATE NOT NULL,
          poNo VARCHAR(50),
          supplierName VARCHAR(255),
          status VARCHAR(100) DEFAULT 'Draft',
          totalAmount DECIMAL(15,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create Details Table
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_grn_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          grnId INT NOT NULL,
          material_id INT,
          materialName VARCHAR(255),
          color VARCHAR(100),
          uom_id INT,
          uom VARCHAR(50),
          poQty DECIMAL(12,2) DEFAULT 0,
          previouslyReceivedQty DECIMAL(12,2) DEFAULT 0,
          receivedQty DECIMAL(12,2) NOT NULL,
          rate DECIMAL(15,2) DEFAULT 0,
          totalAmount DECIMAL(15,2) DEFAULT 0,
          remarks TEXT,
          FOREIGN KEY (grnId) REFERENCES tbl_grn(id) ON DELETE CASCADE
        )
      `);

      // Create Inventory Table
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_inventory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          materialId INT NOT NULL,
          uomId INT NOT NULL,
          color VARCHAR(100),
          quantity DECIMAL(15,2) DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY (materialId, uomId, color)
        )
      `);

      // Ensure columns exist for header
      const hCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_grn");
      const hNames = hCols.map(c => c.Field);

      // Force expansion of status column if it's still restricted
      await DatabaseUtils.query("ALTER TABLE tbl_grn MODIFY COLUMN status VARCHAR(100) DEFAULT 'Draft'");

      if (!hNames.includes('type')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD type ENUM('Receipt', 'Return') DEFAULT 'Receipt' AFTER grnDate");
      }
      if (!hNames.includes('linkGrnId')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD linkGrnId INT AFTER poNo");
      }
      if (!hNames.includes('warehouseId')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD warehouseId INT AFTER linkGrnId");
      }
      if (!hNames.includes('warehouseName')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD warehouseName VARCHAR(255) AFTER warehouseId");
      }
      if (!hNames.includes('warehouseLocation')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD warehouseLocation TEXT AFTER warehouseName");
      }
      if (!hNames.includes('addressLine1')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD addressLine1 VARCHAR(255) AFTER warehouseLocation");
      }
      if (!hNames.includes('addressLine2')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD addressLine2 VARCHAR(255) AFTER addressLine1");
      }
      if (!hNames.includes('city')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD city VARCHAR(100) AFTER addressLine2");
      }
      if (!hNames.includes('state')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD state VARCHAR(100) AFTER city");
      }
      if (!hNames.includes('country')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD country VARCHAR(100) AFTER state");
      }
      if (!hNames.includes('postalCode')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD postalCode VARCHAR(20) AFTER country");
      }
      if (!hNames.includes('supplierGst')) {
          await DatabaseUtils.query("ALTER TABLE tbl_grn ADD supplierGst VARCHAR(50) AFTER postalCode");
      }

      // Ensure columns exist for details
      const dCols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_grn_items");
      const dNames = dCols.map(c => c.Field);

      if (!dNames.includes('material_id')) {
        await DatabaseUtils.query("ALTER TABLE tbl_grn_items ADD material_id INT AFTER grnId");
      }
      if (!dNames.includes('uom_id')) {
        await DatabaseUtils.query("ALTER TABLE tbl_grn_items ADD uom_id INT AFTER color");
      }
      if (!dNames.includes('qcQty')) {
        await DatabaseUtils.query("ALTER TABLE tbl_grn_items ADD qcQty DECIMAL(15,4) DEFAULT 0 AFTER receivedQty");
      }
      if (!dNames.includes('isManual')) {
        await DatabaseUtils.query("ALTER TABLE tbl_grn_items ADD isManual TINYINT DEFAULT 0 AFTER remarks");
      }
      
      await this.repairData();
    } catch (e) {
      console.error("❌ Schema Migration Error:", e.message);
    }
  }

  static async repairData() {
    try {

      // 1. Repair missing supplier names from POs
      const missingSuppliers = await DatabaseUtils.query(`
        SELECT g.id, po.poNo, s.name as supplierName
        FROM tbl_grn g
        JOIN tbl_purchase_order po ON g.poNo = po.poNo
        JOIN tbl_supplier s ON po.supplierId = s.id
        WHERE g.supplierName IS NULL OR g.supplierName = ''
      `);

      for (const row of missingSuppliers) {
        await DatabaseUtils.update("tbl_grn", { supplierName: row.supplierName }, "id = ?", [row.id]);
      }

      // 2. Repair missing material_id by name match
      await DatabaseUtils.query(`
        UPDATE tbl_grn_items gi
        JOIN tbl_material m ON gi.materialName = m.name
        SET gi.material_id = m.id
        WHERE gi.material_id IS NULL OR gi.material_id = 0
      `);

      // 3. Repair missing uom_id by name match
      await DatabaseUtils.query(`
        UPDATE tbl_grn_items gi
        JOIN tbl_uom u ON gi.uom = u.name
        SET gi.uom_id = u.id
        WHERE gi.uom_id IS NULL OR gi.uom_id = 0
      `);
    } catch (e) {
      console.error("❌ Data Repair Error:", e.message);
    }
  }

  static async list(page = 1, limit = 10, searchTerm = "", bomId = null, type = null) {
    await this._ensureSchema();
    let whereClause = "1=1";
    let whereParams = [];

    if (type) {
      whereClause += " AND g.type = ?";
      whereParams.push(type);
    }

    if (searchTerm) {
      whereClause += " AND (g.grnNo LIKE ? OR g.supplierName LIKE ? OR g.poNo LIKE ?)";
      const pattern = `%${searchTerm}%`;
      whereParams.push(pattern, pattern, pattern);
    }

    if (bomId) {
      whereClause += " AND po.bomId = ?";
      whereParams.push(bomId);
    }

    const result = await DatabaseUtils.selectPaginated(
      "tbl_grn g LEFT JOIN tbl_purchase_order po ON g.poNo = po.poNo",
      "g.*",
      whereClause,
      whereParams,
      page,
      limit,
      "g.id DESC"
    );

    const grnList = result.data;
    // Fetch items for each GRN with correct aliasing for frontend
    for (let i = 0; i < grnList.length; i++) {
      grnList[i].lines = await DatabaseUtils.query(
        `SELECT gi.*, gi.material_id as materialId, gi.uom_id as uomId,
                (SELECT COALESCE(SUM(acceptedQty), 0) FROM tbl_qc_items WHERE materialId <=> gi.material_id AND uomId <=> gi.uom_id AND color <=> gi.color AND qcId IN (SELECT id FROM tbl_qc WHERE grnId = gi.grnId)) as totalAccepted,
                (SELECT COALESCE(SUM(rejectedQty), 0) FROM tbl_qc_items WHERE materialId <=> gi.material_id AND uomId <=> gi.uom_id AND color <=> gi.color AND qcId IN (SELECT id FROM tbl_qc WHERE grnId = gi.grnId)) as totalRejected
         FROM tbl_grn_items gi 
         WHERE gi.grnId = ?`,
        [grnList[i].id]
      );
    }

    return {
      list: grnList,
      totalCount: result.pagination.total
    };
  }

  static async listBOMWise(page = 1, limit = 10, searchTerm = "", type = null) {
    const offset = (page - 1) * limit;
    let whereClause = "1=1";
    let whereParams = [];

    if (type) {
      whereClause += " AND g.type = ?";
      whereParams.push(type);
    }

    if (searchTerm) {
      whereClause += " AND b.bomCode LIKE ?";
      whereParams.push(`%${searchTerm}%`);
    }

    const sql = `
      SELECT b.id as bomId, b.bomCode as bomNo, a.name as articleName, COUNT(g.id) as lineCount
      FROM tbl_bom b
      JOIN tbl_article a ON b.articleId = a.id
      INNER JOIN tbl_purchase_order po ON b.id = po.bomId
      INNER JOIN tbl_grn g ON po.poNo = g.poNo
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

  static async generateNextCode() {
    const rows = await DatabaseUtils.query("SELECT grnNo FROM tbl_grn ORDER BY id DESC LIMIT 1");
    if (rows.length === 0) return "GRN-0001";

    const lastCode = rows[0].grnNo;
    const match = lastCode.match(/GRN-(\d+)/);
    if (!match) return "GRN-0001";

    const nextNum = parseInt(match[1]) + 1;
    return `GRN-${nextNum.toString().padStart(4, '0')}`;
  }

  static async create(data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      let grnId = data.id;

      let supplierName = data.supplierName;
      if (!supplierName && data.poNo) {
        const poRows = await DatabaseUtils.query(
          "SELECT s.name FROM tbl_purchase_order po JOIN tbl_supplier s ON po.supplierId = s.id WHERE po.poNo = ?",
          [data.poNo],
          connection
        );
        if (poRows.length > 0) {
          supplierName = poRows[0].name;
        }
      }
      const type = data.type || 'Receipt';
      const isReturn = type === 'Return';
      // Decouple GRN from Stock: Only Returns should update stock here. 
      // Receipts will be handled by the new QC module.
      const shouldUpdate = isReturn; 

      // 1. Calculate status (Receipt vs Return logic)
      let totalReceivedValue = data.lines.reduce((s, l) => s + Number(l.receivedQty || 0), 0);
      if (isReturn) totalReceivedValue = -totalReceivedValue; 

      // 1. Calculate PO-specific fulfillment (ignoring extra/excess items)
      const poLines = data.lines.filter(l => Number(l.poQty || 0) > 0);
      const totalPOValue = poLines.reduce((s, l) => s + Number(l.poQty || 0), 0);
      const netHistoryPOReceived = poLines.reduce((s, l) => s + Number(l.previouslyReceivedQty || 0), 0);
      const currentPOReceived = poLines.reduce((s, l) => s + Number(l.receivedQty || 0), 0);
      const totalNetPOReceived = netHistoryPOReceived + currentPOReceived;

      // 2. Identify what is happening in THIS specific GRN
      const hasCurrentPOReceipt = data.lines.some(l => Number(l.poQty || 0) > 0 && Number(l.receivedQty || 0) > 0);
      const hasCurrentExcessReceipt = data.lines.some(l => Number(l.poQty || 0) === 0 && Number(l.receivedQty || 0) > 0);

      let calculatedStatus = 'Draft';
      if (totalPOValue === 0) {
        if (hasCurrentExcessReceipt || data.lines.length > 0) calculatedStatus = 'Direct Receipt';
      } else {
        // Evaluate PO fulfillment condition (strictly based on PO items)
        let poFulfillmentStatus = 'Partial Received';
        if (totalNetPOReceived >= totalPOValue) poFulfillmentStatus = 'Fully Received';

        if (hasCurrentExcessReceipt) {
          if (!hasCurrentPOReceipt) {
            // ONLY excess items in this GRN
            calculatedStatus = 'Excess Received';
          } else {
            // MIX of PO items and excess items in this GRN
            calculatedStatus = `${poFulfillmentStatus} (+ Excess)`;
          }
        } else {
          // Standard PO receipt with no excess
          calculatedStatus = poFulfillmentStatus;
        }
      }

      // 2. Resolve orderId from PO if possible
      let orderIdFromPo = null;
      if (data.poNo) {
        // Try header-level first (legacy)
        const poRows = await DatabaseUtils.query(`
          SELECT bs.orderId 
          FROM tbl_purchase_order po 
          JOIN tbl_bom_sections bs ON po.bomSectionId = bs.id 
          WHERE po.poNo = ?
        `, [data.poNo], connection);
        
        if (poRows.length > 0 && poRows[0].orderId) {
          orderIdFromPo = poRows[0].orderId;
        } else {
          // Fallback to item-level tracking (new)
          const itemRows = await DatabaseUtils.query(`
            SELECT DISTINCT i.orderId 
            FROM tbl_purchase_order_items i
            JOIN tbl_purchase_order p ON i.poId = p.id
            WHERE p.poNo = ? AND i.orderId IS NOT NULL 
            LIMIT 1
          `, [data.poNo], connection);
          if (itemRows.length > 0) orderIdFromPo = itemRows[0].orderId;
        }
      }

      if (grnId) {
        // Fetch existing items to calculate deltas
        const oldItemsRows = await DatabaseUtils.query("SELECT * FROM tbl_grn_items WHERE grnId = ?", [grnId], connection);

        // 1. Map old items by a unique key (Material|UOM|Color)
        const oldDataMap = new Map();
        for (const item of oldItemsRows) {
          let mId = item.material_id;
          let uId = item.uom_id;

          // Resolve IDs if missing (legacy)
          if (!mId && item.materialName) {
            const mRows = await DatabaseUtils.query("SELECT id FROM tbl_material WHERE name = ?", [item.materialName], connection);
            if (mRows.length > 0) mId = mRows[0].id;
          }
          if (!uId && item.uom) {
            const uRows = await DatabaseUtils.query("SELECT id FROM tbl_uom WHERE name = ?", [item.uom], connection);
            if (uRows.length > 0) uId = uRows[0].id;
          }

          const key = `${mId}|${uId}|${item.color || ''}`;
          const current = oldDataMap.get(key) || { receivedQty: 0, qcQty: 0 };
          oldDataMap.set(key, {
            receivedQty: current.receivedQty + Number(item.receivedQty || 0),
            qcQty: current.qcQty + Number(item.qcQty || 0)
          });
        }

        // 2. Delete old items and update header
        await DatabaseUtils.query("DELETE FROM tbl_grn_items WHERE grnId = ?", [grnId], connection);
        await DatabaseUtils.update("tbl_grn", {
          grnDate: data.grnDate,
          poNo: data.poNo,
          supplierName: supplierName,
          status: calculatedStatus,
          totalAmount: data.totalAmount || 0,
          warehouseId: data.warehouseId || null,
          warehouseName: data.warehouseName || null,
          warehouseLocation: data.warehouseLocation || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          supplierGst: data.supplierGst || null
        }, "id = ?", [grnId], connection);

        // 3. Process new lines and calculate deltas
        for (const line of data.lines) {
          const mId = line.materialId ? Number(line.materialId) : null;
          const uId = line.uomId ? Number(line.uomId) : null;
          const key = `${mId}|${uId}|${line.color || ''}`;

          const newQty = Number(line.receivedQty || 0);
          const oldData = oldDataMap.get(key) || { receivedQty: 0, qcQty: 0 };
          const delta = newQty - oldData.receivedQty;

          // Save line item
          await DatabaseUtils.insert("tbl_grn_items", {
            grnId,
            orderId: line.isManual ? null : orderIdFromPo, // Track SO
            material_id: mId,
            materialName: line.materialName,
            color: line.color,
            uom_id: uId,
            uom: line.uom,
            poQty: Number(line.poQty || 0),
            previouslyReceivedQty: Number(line.previouslyReceivedQty || 0),
            receivedQty: newQty,
            qcQty: oldData.qcQty, // Restore QC quantity!
            rate: Number(line.rate || 0),
            totalAmount: Number(line.totalAmount || 0),
            remarks: line.remarks || null,
            isManual: line.isManual ? 1 : 0
          }, connection);

          // ONLY update stock if there is a CHANGE and NOT manual AND allowed
          if (shouldUpdate && !line.isManual && mId && delta !== 0) {
            const type = delta > 0 ? 'IN' : 'OUT';
            const remarks = delta > 0 ? 'GRN Edit (Increase)' : 'GRN Edit (Reduction)';
            // Use orderIdFromPo for returns tied to POs, else null
            await this._updateStock(mId, uId, line.color, delta, grnId, data.poNo, connection, type, remarks, line.isManual ? null : orderIdFromPo);
          }

          // Remove from map to track what's left
          oldDataMap.delete(key);
        }

        // 4. Handle remaining items (items removed entirely from the GRN)
        if (shouldUpdate) {
            for (const [key, oldVal] of oldDataMap.entries()) {
              if (oldVal.receivedQty > 0) {
                const [mId, uId, color] = key.split('|');
                await this._updateStock(Number(mId), Number(uId), color, -oldVal.receivedQty, grnId, data.poNo, connection, 'OUT', 'GRN Edit (Line Removed)');
              }
            }
        }

      } else {
        grnId = await DatabaseUtils.insert("tbl_grn", {
          grnNo: data.grnNo,
          grnDate: data.grnDate,
          poNo: data.poNo,
          linkGrnId: data.linkGrnId || null,
          type: type,
          supplierName: supplierName,
          status: calculatedStatus,
          totalAmount: data.totalAmount || 0,
          warehouseId: data.warehouseId || null,
          warehouseName: data.warehouseName || null,
          warehouseLocation: data.warehouseLocation || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          supplierGst: data.supplierGst || null
        }, connection);

        for (const line of data.lines) {
            const mId = line.materialId ? Number(line.materialId) : null;
            const uId = line.uomId ? Number(line.uomId) : null;
            const qty = Number(line.receivedQty || 0);
            const stockChange = isReturn ? -qty : qty;

            await DatabaseUtils.insert("tbl_grn_items", {
                grnId,
                orderId: line.isManual ? null : orderIdFromPo, // Track SO
                material_id: mId,
                materialName: line.materialName,
                color: line.color,
                uom_id: uId,
                uom: line.uom,
                poQty: Number(line.poQty || 0),
                previouslyReceivedQty: Number(line.previouslyReceivedQty || 0),
                receivedQty: qty,
                rate: Number(line.rate || 0),
                totalAmount: Number(line.totalAmount || 0),
                remarks: line.remarks || null,
                isManual: line.isManual ? 1 : 0
            }, connection);

            if (shouldUpdate && !line.isManual && mId && qty !== 0) {
              const moveType = stockChange < 0 ? 'OUT' : 'IN';
              const moveRemarks = isReturn ? 'Purchase Return' : 'GRN Receipt';
              await this._updateStock(mId, uId, line.color, stockChange, grnId, data.poNo, connection, moveType, moveRemarks, line.isManual ? null : orderIdFromPo);
              
              // Direct Reduction in linked GRN (User requirement)
              if (isReturn && data.linkGrnId) {
                  await DatabaseUtils.query(`
                      UPDATE tbl_grn_items 
                      SET receivedQty = receivedQty - ?, totalAmount = totalAmount - (? * rate)
                      WHERE grnId = ? AND material_id = ? AND uom_id = ? AND color = ?
                  `, [qty, qty, data.linkGrnId, mId, uId, line.color || ''], connection);
                  
                  // Update original GRN total
                  await DatabaseUtils.query(`
                      UPDATE tbl_grn 
                      SET totalAmount = (SELECT SUM(totalAmount) FROM tbl_grn_items WHERE grnId = ?)
                      WHERE id = ?
                  `, [data.linkGrnId, data.linkGrnId], connection);
              }
            }
        }
      }
      return grnId;
    });
  }

  static async getPoTotals(poNo) {
    // 1. Get total GRN Receipts for this PO
    const grnRows = await DatabaseUtils.query(`
      SELECT 
        gi.material_id, 
        gi.materialName, 
        gi.uom_id, 
        gi.color,
        SUM(gi.receivedQty) as totalReceived
      FROM tbl_grn_items gi
      JOIN tbl_grn g ON gi.grnId = g.id
      WHERE g.poNo = ? AND g.type = 'Receipt'
      GROUP BY gi.material_id, gi.materialName, gi.uom_id, gi.color
    `, [poNo]);

    // 2. Get total QC Rejections for this PO
    const qcRows = await DatabaseUtils.query(`
      SELECT 
        qi.materialId, 
        qi.materialName, 
        qi.uomId, 
        qi.color,
        SUM(qi.rejectedQty) as totalRejected
      FROM tbl_qc_items qi
      JOIN tbl_qc q ON qi.qcId = q.id
      JOIN tbl_grn g ON q.grnId = g.id
      WHERE g.poNo = ?
      GROUP BY qi.materialId, qi.materialName, qi.uomId, qi.color
    `, [poNo]);

    // Create maps for easy lookup
    const qcMap = {};
    qcRows.forEach(q => {
      // Standardize key: material (ID or Name) | uom (ID) | color
      const key = `${q.materialId || q.materialName}|${q.uomId}|${q.color || ''}`;
      qcMap[key] = Number(q.totalRejected || 0);
    });

    const totals = {};
    grnRows.forEach(r => {
      // NOTE: tbl_grn_items uses material_id/uom_id (snake_case)
      const key = `${r.material_id || r.materialName}|${r.uom_id}|${r.color || ''}`;
      const rejections = qcMap[key] || 0;
      // Net Received = Total Received - Total QC Rejections
      totals[key] = Math.max(0, Number(r.totalReceived || 0) - rejections);
    });

    return totals;
  }

  static async getById(id) {
    const [grn] = await DatabaseUtils.query("SELECT * FROM tbl_grn WHERE id = ?", [id]);
    if (!grn) return null;

    const items = await DatabaseUtils.query(`
      SELECT 
        gi.*, 
        gi.material_id as materialId, 
        gi.uom_id as uomId
      FROM tbl_grn_items gi 
      WHERE gi.grnId = ?
    `, [id]);
    
    grn.items = items;
    grn.lines = items;
    return grn;
  }

  static async _updateStock(materialId, uomId, color, qtyChange, grnId, poNo, connection, type = 'IN', remarks = 'GRN Receipt', orderId = null) {
    // 1. Update Physical Stock (SO-aware)
    const rows = await DatabaseUtils.query(
      "SELECT id, quantity FROM tbl_inventory WHERE materialId = ? AND uomId = ? AND color = ? AND orderId <=> ?",
      [materialId, uomId, color || '', orderId],
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
        quantity: qtyChange
      }, connection);
    }

    // 2. Insert into Ledger for Audit/History
    await DatabaseUtils.insert("tbl_inventory_ledger", {
      materialId,
      uomId,
      color: color || '',
      grnId,
      poNo,
      orderId: orderId,
      quantity: Math.abs(qtyChange),
      transactionType: qtyChange < 0 ? 'OUT' : 'IN',
      remarks
    }, connection);
  }

  static async delete(id) {
    return await DatabaseUtils.executeTransaction(async (conn) => {
      // 1. Get header to have PO No
      const grn = await DatabaseUtils.query("SELECT poNo FROM tbl_grn WHERE id = ?", [id], conn);
      const poNo = grn.length > 0 ? grn[0].poNo : null;

      // 2. Revert stock for all items
      const items = await DatabaseUtils.query("SELECT * FROM tbl_grn_items WHERE grnId = ?", [id], conn);
      for (const item of items) {
        let mId = item.material_id;
        let uId = item.uom_id;

        // Legacy Fallback
        if (!mId && item.materialName) {
          const mRows = await DatabaseUtils.query("SELECT id FROM tbl_material WHERE name = ?", [item.materialName], conn);
          if (mRows.length > 0) mId = mRows[0].id;
        }
        if (!uId && item.uom) {
          const uRows = await DatabaseUtils.query("SELECT id FROM tbl_uom WHERE name = ?", [item.uom], conn);
          if (uRows.length > 0) uId = uRows[0].id;
        }

        // Only revert stock if it was a Return (since Receipts don't add stock anymore)
        const grnType = grn.length > 0 ? grn[0].type : 'Receipt';
        if (mId && item.receivedQty > 0 && grnType === 'Return') {
          await this._updateStock(
            mId,
            uId,
            item.color,
            -item.receivedQty,
            id,
            poNo,
            conn,
            'OUT',
            'GRN Deletion',
            item.orderId || null
          );
        }
      }
      // 3. Delete from DB (ON DELETE CASCADE handles items if configured, but let's be safe)
      await DatabaseUtils.query("DELETE FROM tbl_grn_items WHERE grnId = ?", [id], conn);
      await DatabaseUtils.query("DELETE FROM tbl_grn WHERE id = ?", [id], conn);
    });
  }
}

module.exports = GRNModel;
