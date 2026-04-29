const DatabaseUtils = require('../utils/database.utils');

class ReturnModel {
  static async _ensureSchema() {
    try {
      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_return (
          id INT AUTO_INCREMENT PRIMARY KEY,
          returnNo VARCHAR(50) NOT NULL UNIQUE,
          returnDate DATE NOT NULL,
          supplierName VARCHAR(255),
          poNo VARCHAR(50),
          linkGrnId INT,
          totalAmount DECIMAL(15,2) DEFAULT 0,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'Completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await DatabaseUtils.query(`
        CREATE TABLE IF NOT EXISTS tbl_return_items (
          id INT AUTO_INCREMENT PRIMARY KEY,
          returnId INT NOT NULL,
          material_id INT,
          materialName VARCHAR(255),
          color VARCHAR(255),
          uom_id INT,
          uom VARCHAR(50),
          qty DECIMAL(15,2) DEFAULT 0,
          isManual TINYINT DEFAULT 0,
          poQty DECIMAL(15,2) DEFAULT 0,
          rate DECIMAL(15,2) DEFAULT 0,
          totalAmount DECIMAL(15,2) DEFAULT 0,
          remarks TEXT,
          FOREIGN KEY (returnId) REFERENCES tbl_return(id) ON DELETE CASCADE
        )
      `);

      try {
        const cols = await DatabaseUtils.query("SHOW COLUMNS FROM tbl_return_items");
        const colNames = cols.map(c => c.Field);
        if (!colNames.includes('isManual')) {
          await DatabaseUtils.query("ALTER TABLE tbl_return_items ADD isManual TINYINT DEFAULT 0 AFTER qty");
        }
        await DatabaseUtils.query("ALTER TABLE tbl_return_items ADD COLUMN IF NOT EXISTS poQty DECIMAL(15,2) DEFAULT 0 AFTER isManual");
      } catch (e) {
        // Column might already exist
      }
    } catch (e) {
      console.error("❌ Return Schema Error:", e.message);
    }
  }

  static async list(filter = {}) {
    await this._ensureSchema();
    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*, g.grnNo as linkGrnNo 
      FROM tbl_return r 
      LEFT JOIN tbl_grn g ON r.linkGrnId = g.id 
      ORDER BY r.id DESC 
      LIMIT ? OFFSET ?
    `;
    const rows = await DatabaseUtils.query(sql, [limit, offset]);
    const count = await DatabaseUtils.query("SELECT COUNT(*) as total FROM tbl_return");

    for (const row of rows) {
      row.lines = await DatabaseUtils.query("SELECT * FROM tbl_return_items WHERE returnId = ?", [row.id]);
      // Support for UI mapping
      row.lines = row.lines.map(l => ({
          ...l,
          receivedQty: l.qty, // Map back to receivedQty for UI reuse
          materialId: l.material_id,
          uomId: l.uom_id
      }));
    }

    return { data: rows, total: count[0]?.total || 0 };
  }

  static async create(data) {
    await this._ensureSchema();
    const connection = await DatabaseUtils.getConnection();
    await connection.beginTransaction();

    try {
      let returnId = data.id;
      const totalHeaderAmount = data.lines.reduce((s, l) => s + Number(l.totalAmount || 0), 0);

      if (returnId) {
        // --- 1. REVERSION LOGIC (For Edit/Update) ---
        const oldHeader = (await DatabaseUtils.query("SELECT * FROM tbl_return WHERE id = ?", [returnId], connection))[0];
        const oldItems = await DatabaseUtils.query("SELECT * FROM tbl_return_items WHERE returnId = ?", [returnId], connection);

        if (oldHeader && oldHeader.linkGrnId) {
          // If it was linked to a GRN, we must REVERT (add back) the stock and GRN quantities before re-applying
          for (const item of oldItems) {
            if (item.material_id && item.qty > 0) {
              // Revert Stock (IN because return was an OUT)
              await this._updateStock(item.material_id, item.uom_id, item.color, item.qty, returnId, oldHeader.poNo, connection);
              
              // Revert GRN items (Add back what was subtracted)
              await DatabaseUtils.query(`
                UPDATE tbl_grn_items 
                SET receivedQty = receivedQty + ?, totalAmount = totalAmount + (? * rate)
                WHERE grnId = ? AND material_id = ? AND uom_id = ? AND color = ?
              `, [item.qty, item.qty, oldHeader.linkGrnId, item.material_id, item.uom_id, item.color || ''], connection);
            }
          }
          // Update original GRN summary total
          await DatabaseUtils.query(`
            UPDATE tbl_grn 
            SET totalAmount = (SELECT SUM(totalAmount) FROM tbl_grn_items WHERE grnId = ?)
            WHERE id = ?
          `, [oldHeader.linkGrnId, oldHeader.linkGrnId], connection);
        }

        // --- 2. UPDATE HEADER AND CLEAR OLD ITEMS ---
        await DatabaseUtils.update("tbl_return", {
          returnDate: data.returnDate,
          supplierName: data.supplierName,
          poNo: data.poNo,
          linkGrnId: data.linkGrnId || null,
          totalAmount: totalHeaderAmount,
          remarks: data.remarks || null
        }, "id = ?", [returnId], connection);

        await DatabaseUtils.query("DELETE FROM tbl_return_items WHERE returnId = ?", [returnId], connection);

      } else {
        // --- 3. CREATE NEW HEADER ---
        returnId = await DatabaseUtils.insert("tbl_return", {
          returnNo: data.returnNo,
          returnDate: data.returnDate,
          supplierName: data.supplierName,
          poNo: data.poNo,
          linkGrnId: data.linkGrnId || null,
          totalAmount: totalHeaderAmount,
          remarks: data.remarks || null
        }, connection);
      }

      // --- 4. INSERT / RE-INSERT ITEMS ---
      const validLinkGrnId = data.linkGrnId && !isNaN(Number(data.linkGrnId)) && Number(data.linkGrnId) > 0;

      for (const line of data.lines) {
        const mId = line.materialId ? Number(line.materialId) : null;
        const uId = line.uomId ? Number(line.uomId) : null;
        const qty = Number(line.receivedQty || 0);

        const isManual = line.isManual;

        await DatabaseUtils.insert("tbl_return_items", {
          returnId: returnId,
          material_id: mId,
          materialName: line.materialName,
          color: line.color,
          uom_id: uId,
          uom: line.uom,
          qty: qty,
          isManual: isManual ? 1 : 0,
          poQty: Number(line.poQty || 0),
          rate: Number(line.rate || 0),
          totalAmount: Number(line.totalAmount || 0),
          remarks: line.remarks || null
        }, connection);

        // Physical Stock Update & GRN Linking (Only if NOT manual AND return is against a specific, valid GRN ID)
        if (!isManual && validLinkGrnId && mId && qty > 0) {
           // Update Physical Stock (OUT)
           await this._updateStock(mId, uId, line.color, -qty, returnId, data.poNo, connection);
           
           // Reduce original GRN's item quantities
           await DatabaseUtils.query(`
              UPDATE tbl_grn_items 
              SET receivedQty = receivedQty - ?, totalAmount = totalAmount - (? * rate)
              WHERE grnId = ? AND material_id = ? AND uom_id = ? AND color = ?
           `, [qty, qty, data.linkGrnId, mId, uId, line.color || ''], connection);
        }
      }

      // Final GRN Total Update (if linked)
      if (validLinkGrnId) {
        await DatabaseUtils.query(`
            UPDATE tbl_grn 
            SET totalAmount = (SELECT SUM(totalAmount) FROM tbl_grn_items WHERE grnId = ?)
            WHERE id = ?
        `, [data.linkGrnId, data.linkGrnId], connection);
      }

      await connection.commit();
      return returnId;
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  static async _updateStock(mId, uId, color, qty, refId, poNo, connection) {
      // Re-use logic from inventory model or implement here
      const InventoryModel = require('./inventory.model');
      await InventoryModel.updateStock(mId, uId, color, qty, refId, poNo, connection, 'OUT', 'Purchase Return');
  }

  static async generateCode() {
    const rows = await DatabaseUtils.query("SELECT MAX(id) as maxId FROM tbl_return");
    const nextId = (rows[0].maxId || 0) + 1;
    return `RET-${nextId.toString().padStart(4, '0')}`;
  }
  static async delete(id) {
    const connection = await DatabaseUtils.getConnection();
    await connection.beginTransaction();

    try {
      const row = await DatabaseUtils.query("SELECT * FROM tbl_return WHERE id = ?", [id]);
      if (!row.length) throw new Error("Return not found");
      const ret = row[0];

      const items = await DatabaseUtils.query("SELECT * FROM tbl_return_items WHERE returnId = ?", [id]);
      
      for (const item of items) {
        // Revert Stock and GRN (Only if it was a physical return linked to a valid GRN)
        const validLinkGrnId = ret.linkGrnId && !isNaN(Number(ret.linkGrnId)) && Number(ret.linkGrnId) > 0;

        if (validLinkGrnId && item.material_id && item.qty > 0) {
           // Revert Stock (IN because we are deleting an OUT)
           await this._updateStock(item.material_id, item.uom_id, item.color, item.qty, item.returnId, ret.poNo, connection);
           
           await DatabaseUtils.query(`
              UPDATE tbl_grn_items 
              SET receivedQty = receivedQty + ?, totalAmount = totalAmount + (? * rate)
              WHERE grnId = ? AND material_id = ? AND uom_id = ? AND color = ?
           `, [item.qty, item.qty, ret.linkGrnId, item.material_id, item.uom_id, item.color || ''], connection);
        }
      }

      if (ret.linkGrnId && Number(ret.linkGrnId) > 0) {
          await DatabaseUtils.query(`
            UPDATE tbl_grn 
            SET totalAmount = (SELECT SUM(totalAmount) FROM tbl_grn_items WHERE grnId = ?)
            WHERE id = ?
          `, [ret.linkGrnId, ret.linkGrnId], connection);
      }

      await DatabaseUtils.query("DELETE FROM tbl_return_items WHERE returnId = ?", [id], connection);
      await DatabaseUtils.query("DELETE FROM tbl_return WHERE id = ?", [id], connection);

      await connection.commit();
      return true;
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }
}

ReturnModel._ensureSchema();
module.exports = ReturnModel;
