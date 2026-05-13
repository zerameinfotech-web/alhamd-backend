const DatabaseUtils = require("../utils/database.utils");

class PurchaseOrderModel {
  static async _ensureSchema() {
    const columns = [
      "ALTER TABLE tbl_purchase_order ADD COLUMN delayDays INT DEFAULT 0 AFTER deliveryDate",
      "ALTER TABLE tbl_purchase_order ADD COLUMN warehouseId INT AFTER delayDays",
      "ALTER TABLE tbl_purchase_order ADD COLUMN warehouseName VARCHAR(255) AFTER warehouseId",
      "ALTER TABLE tbl_purchase_order ADD COLUMN warehouseLocation TEXT AFTER warehouseName",
      "ALTER TABLE tbl_purchase_order ADD COLUMN terms TEXT AFTER warehouseLocation",
      "ALTER TABLE tbl_purchase_order ADD COLUMN addressLine1 VARCHAR(255) AFTER terms",
      "ALTER TABLE tbl_purchase_order ADD COLUMN addressLine2 VARCHAR(255) AFTER addressLine1",
      "ALTER TABLE tbl_purchase_order ADD COLUMN city VARCHAR(100) AFTER addressLine2",
      "ALTER TABLE tbl_purchase_order ADD COLUMN state VARCHAR(100) AFTER city",
      "ALTER TABLE tbl_purchase_order ADD COLUMN country VARCHAR(100) AFTER state",
      "ALTER TABLE tbl_purchase_order ADD COLUMN postalCode VARCHAR(20) AFTER country",
      "ALTER TABLE tbl_purchase_order ADD COLUMN supplierGst VARCHAR(50) AFTER postalCode",
      "ALTER TABLE tbl_purchase_order ADD COLUMN poType VARCHAR(20) DEFAULT 'Regular' AFTER supplierGst",
      "ALTER TABLE tbl_purchase_order MODIFY COLUMN supplierId INT NULL",
      "ALTER TABLE tbl_purchase_order MODIFY COLUMN bomId INT NULL"
    ];

    for (const sql of columns) {
      try {
        await DatabaseUtils.query(sql);
      } catch (e) {
        // Column likely already exists
      }
    }

    // Ensure Items table has orderId
    try {
        await DatabaseUtils.query("ALTER TABLE tbl_purchase_order_items ADD COLUMN orderId INT AFTER poId");
    } catch (e) {}
    // Ensure Items table has bomId (for per-vendor PO across multiple BOMs)
    try {
        await DatabaseUtils.query("ALTER TABLE tbl_purchase_order_items ADD COLUMN bomId INT AFTER orderId");
    } catch (e) {}
  }

  static async generateNextCode() {
    const rows = await DatabaseUtils.query(
      "SELECT poNo FROM tbl_purchase_order WHERE poNo REGEXP '^PO-[0-9]+'"
    );
    let maxBase = 0;
    for (const r of rows) {
      const m = String(r.poNo || '').match(/^PO-(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxBase) maxBase = n;
      }
    }
    const next = maxBase + 1;
    return `PO-${String(next).padStart(4, '0')}`;
  }

  static async createBatch(payload) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      const createdIds = [];
      for (const data of payload.list) {
        const poId = await DatabaseUtils.insert("tbl_purchase_order", {
          poNo: data.poNo,
          poDate: data.poDate,
          bomId: data.bomId || null,
          bomSectionId: data.bomSectionId || null,
          supplierId: data.supplierId || null,
          supplierContact: data.supplierContact || null,
          paymentTerms: data.paymentTerms || null,
          deliveryDate: data.deliveryDate || null,
          delayDays: data.delayDays || 0,
          warehouseId: data.warehouseId || null,
          warehouseName: data.warehouseName || null,
          warehouseLocation: data.warehouseLocation || null,
          terms: data.terms || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          postalCode: data.postalCode || null,
          supplierGst: data.supplierGst || null,
          poType: data.poType || 'Regular',
          totalValue: data.totalValue || 0,
          status: data.status || 'Draft'
        }, connection);

        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            await DatabaseUtils.insert("tbl_purchase_order_items", {
              poId,
              orderId: item.orderId || null,
              bomId: item.bomId || null,
              itemGroupId: item.itemGroupId || null,
              materialId: item.materialId || null,
              materialName: item.materialName || null,
              uomId: item.uomId || null,
              color: item.color || null,
              bomQty: item.bomQty || 0,
              bomPrice: item.bomPrice || 0,
              orderQty: item.orderQty || 0,
              rate: item.rate || 0,
              totalAmount: item.totalAmount || 0,
              gstSlab: item.gstSlab || null,
              gstPrice: item.gstPrice || 0,
              materialType: item.materialType || 'Local',
              dutyPercentage: item.dutyPercentage || 0,
              dutyAmount: item.dutyAmount || 0,
              clearingPercentage: item.clearingPercentage || 0,
              clearingAmount: item.clearingAmount || 0
            }, connection);
          }
        }
        createdIds.push({ id: poId, poNo: data.poNo, supplierId: data.supplierId });
      }
      return createdIds;
    });
  }

  static async create(data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Insert Header
      const poId = await DatabaseUtils.insert("tbl_purchase_order", {
        poNo: data.poNo,
        poDate: data.poDate,
        bomId: data.bomId || null,
        bomSectionId: data.bomSectionId || null,
        supplierId: data.supplierId || null,
        supplierContact: data.supplierContact || null,
        paymentTerms: data.paymentTerms || null,
        deliveryDate: data.deliveryDate || null,
        delayDays: data.delayDays || 0,
        warehouseId: data.warehouseId || null,
        warehouseName: data.warehouseName || null,
        warehouseLocation: data.warehouseLocation || null,
        terms: data.terms || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        supplierGst: data.supplierGst || null,
        poType: data.poType || 'Regular',
        totalValue: data.totalValue || 0,
        status: data.status || 'Draft'
      }, connection);

      // 2. Fetch orderId if bomSectionId is provided
      let orderId = null;
      if (data.bomSectionId) {
        const sectionRows = await DatabaseUtils.query(
          "SELECT orderId FROM tbl_bom_sections WHERE id = ?",
          [data.bomSectionId],
          connection
        );
        if (sectionRows.length > 0) {
          orderId = sectionRows[0].orderId;
        }
      }

      // 3. Insert Items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await DatabaseUtils.insert("tbl_purchase_order_items", {
            poId,
            orderId: item.orderId || orderId, // Propagate SO link
            itemGroupId: item.itemGroupId || null,
            materialId: item.materialId || null,
            materialName: item.materialName || null,
            uomId: item.uomId || null,
            color: item.color || null,
            bomQty: item.bomQty || 0,
            bomPrice: item.bomPrice || 0,
            orderQty: item.orderQty || 0,
            rate: item.rate || 0,
            totalAmount: item.totalAmount || 0,
            gstSlab: item.gstSlab || null,
            gstPrice: item.gstPrice || 0
          }, connection);
        }
      }

      return poId;
    });
  }

  static async list(page = 1, limit = 10, searchTerm = "", bomId = null, poType = null) {
    let whereClause = "1=1";
    let whereParams = [];

    if (searchTerm) {
      whereClause += " AND (po.poNo LIKE ? OR s.name LIKE ? OR b.bomCode LIKE ?)";
      const pattern = `%${searchTerm}%`;
      whereParams.push(pattern, pattern, pattern);
    }

    if (bomId) {
      whereClause += " AND po.bomId = ?";
      whereParams.push(bomId);
    }

    if (poType === 'General') {
      whereClause += " AND po.poType = 'General'";
    } else if (poType === 'Regular') {
      whereClause += " AND (po.poType = 'Regular' OR po.poType IS NULL)";
    }

    // Base PO no = part before vendor suffix `-NN`. PO-0042-01 → PO-0042.
    const baseExpr = "IF(LOCATE('-', po.poNo, 4) > 0, LEFT(po.poNo, LOCATE('-', po.poNo, 4) - 1), po.poNo)";
    const offset = (page - 1) * limit;

    const baseRows = await DatabaseUtils.query(
      `SELECT ${baseExpr} AS basePoNo, MAX(po.id) AS sortKey
       FROM tbl_purchase_order po
       LEFT JOIN tbl_supplier s ON po.supplierId = s.id
       LEFT JOIN tbl_bom b ON po.bomId = b.id
       WHERE ${whereClause}
       GROUP BY basePoNo
       ORDER BY sortKey DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    );

    const countRows = await DatabaseUtils.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT ${baseExpr} AS basePoNo
         FROM tbl_purchase_order po
         LEFT JOIN tbl_supplier s ON po.supplierId = s.id
         LEFT JOIN tbl_bom b ON po.bomId = b.id
         WHERE ${whereClause}
         GROUP BY basePoNo
       ) t`,
      whereParams
    );
    const totalCount = countRows[0]?.total || 0;

    if (baseRows.length === 0) {
      return { list: [], totalCount };
    }

    const bases = baseRows.map(r => r.basePoNo);
    const placeholders = bases.map(() => "?").join(",");
    const poList = await DatabaseUtils.query(
      `SELECT po.*, s.name as supplierName, b.bomCode as bomCode,
              (SELECT COUNT(*) FROM tbl_grn WHERE poNo = po.poNo) as grnCount,
              ${baseExpr} AS basePoNo
       FROM tbl_purchase_order po
       LEFT JOIN tbl_supplier s ON po.supplierId = s.id
       LEFT JOIN tbl_bom b ON po.bomId = b.id
       WHERE ${baseExpr} IN (${placeholders})
       ORDER BY FIELD(${baseExpr}, ${placeholders}), po.id DESC`,
      [...bases, ...bases]
    );

    for (let i = 0; i < poList.length; i++) {
      poList[i].items = await DatabaseUtils.query(
        `SELECT poi.*, ig.name as itemGroupName, u.name as uomName, m.name as materialName
         FROM tbl_purchase_order_items poi
         LEFT JOIN tbl_item_group ig ON poi.itemGroupId = ig.id
         LEFT JOIN tbl_uom u ON poi.uomId = u.id
         LEFT JOIN tbl_material m ON poi.materialId = m.id
         WHERE poi.poId = ?`,
        [poList[i].id]
      );
    }

    return { list: poList, totalCount };
  }

  static async listBOMWise(page = 1, limit = 10, searchTerm = "") {
    const offset = (page - 1) * limit;
    let whereClause = "1=1";
    let whereParams = [];

    if (searchTerm) {
      whereClause += " AND b.bomCode LIKE ?";
      whereParams.push(`%${searchTerm}%`);
    }

    const sql = `
      SELECT b.id as bomId, b.bomCode as bomNo, COUNT(po.id) as poCount
      FROM tbl_bom b
      INNER JOIN tbl_purchase_order po ON b.id = po.bomId
      WHERE ${whereClause}
      GROUP BY b.id, b.bomCode
      ORDER BY b.bomCode ASC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM tbl_bom b
      INNER JOIN tbl_purchase_order po ON b.id = po.bomId
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

  static async update(id, data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Update Header
      await DatabaseUtils.update("tbl_purchase_order", {
        poDate: data.poDate,
        bomId: data.bomId || null,
        bomSectionId: data.bomSectionId || null,
        supplierId: data.supplierId || null,
        supplierContact: data.supplierContact || null,
        paymentTerms: data.paymentTerms || null,
        deliveryDate: data.deliveryDate || null,
        delayDays: data.delayDays || 0,
        warehouseId: data.warehouseId || null,
        warehouseName: data.warehouseName || null,
        warehouseLocation: data.warehouseLocation || null,
        terms: data.terms || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        postalCode: data.postalCode || null,
        supplierGst: data.supplierGst || null,
        poType: data.poType || 'Regular',
        totalValue: data.totalValue || 0,
        status: data.status || 'Draft'
      }, "id = ?", [id], connection);

      // 2. Delete existing items
      await DatabaseUtils.query(
        "DELETE FROM tbl_purchase_order_items WHERE poId = ?",
        [id],
        connection
      );

      // 3. Insert new items
      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          await DatabaseUtils.insert("tbl_purchase_order_items", {
            poId: id,
            orderId: item.orderId || null, // Propagate SO link
            itemGroupId: item.itemGroupId || null,
            materialId: item.materialId || null,
            materialName: item.materialName || null,
            uomId: item.uomId || null,
            color: item.color || null,
            bomQty: item.bomQty || 0,
            bomPrice: item.bomPrice || 0,
            orderQty: item.orderQty || 0,
            rate: item.rate || 0,
            totalAmount: item.totalAmount || 0,
            gstSlab: item.gstSlab || null,
            gstPrice: item.gstPrice || 0
          }, connection);
        }
      }

      return id;
    });
  }
  static async delete(id) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Delete Items
      await DatabaseUtils.query(
        "DELETE FROM tbl_purchase_order_items WHERE poId = ?",
        [id],
        connection
      );
      // 2. Delete Header
      return await DatabaseUtils.query(
        "DELETE FROM tbl_purchase_order WHERE id = ?",
        [id],
        connection
      );
    });
  }

  static async getById(id) {
    const header = await DatabaseUtils.query(
      `SELECT po.*, s.name as supplierName, b.bomCode,
       (SELECT COUNT(*) FROM tbl_grn WHERE poNo = po.poNo) as grnCount
       FROM tbl_purchase_order po 
       LEFT JOIN tbl_supplier s ON po.supplierId = s.id 
       LEFT JOIN tbl_bom b ON po.bomId = b.id 
       WHERE po.id = ?`,
      [id]
    );

    if (header.length === 0) return null;

    const items = await DatabaseUtils.query(
      `SELECT poi.*, ig.name as itemGroupName, u.name as uomName, m.name as materialName,
              o.orderCode as orderCode, o.orderName as orderName
       FROM tbl_purchase_order_items poi
       LEFT JOIN tbl_item_group ig ON poi.itemGroupId = ig.id
       LEFT JOIN tbl_uom u ON poi.uomId = u.id
       LEFT JOIN tbl_material m ON poi.materialId = m.id
       LEFT JOIN tbl_orders o ON poi.orderId = o.id
       WHERE poi.poId = ?`,
      [id]
    );

    const orderSummary = await DatabaseUtils.query(
      `SELECT DISTINCT o.id, o.orderCode, o.orderName
       FROM tbl_purchase_order_items poi
       INNER JOIN tbl_orders o ON poi.orderId = o.id
       WHERE poi.poId = ?`,
      [id]
    );

    return {
      ...header[0],
      items,
      orders: orderSummary
    };
  }
}

module.exports = PurchaseOrderModel;
