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
      "ALTER TABLE tbl_purchase_order ADD COLUMN supplierGst VARCHAR(50) AFTER postalCode"
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
  }

  static async generateNextCode() {
    const rows = await DatabaseUtils.query(
      "SELECT poNo FROM tbl_purchase_order ORDER BY id DESC LIMIT 1"
    );
    if (rows.length === 0) return "PO-0001";

    const lastCode = rows[0].poNo;
    const match = lastCode.match(/\d+/);
    const lastNum = match ? parseInt(match[0], 10) : 0;
    const newNum = lastNum + 1;

    return `PO-${String(newNum).padStart(4, '0')}`;
  }

  static async create(data) {
    await this._ensureSchema();
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Insert Header
      const poId = await DatabaseUtils.insert("tbl_purchase_order", {
        poNo: data.poNo,
        poDate: data.poDate,
        bomId: data.bomId,
        bomSectionId: data.bomSectionId || null,
        supplierId: data.supplierId,
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

  static async list(page = 1, limit = 10, searchTerm = "", bomId = null) {
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

    const result = await DatabaseUtils.selectPaginated(
      "tbl_purchase_order po LEFT JOIN tbl_supplier s ON po.supplierId = s.id LEFT JOIN tbl_bom b ON po.bomId = b.id",
      "po.*, s.name as supplierName, b.bomCode as bomCode, (SELECT COUNT(*) FROM tbl_grn WHERE poNo = po.poNo) as grnCount",
      whereClause,
      whereParams,
      page,
      limit,
      "po.id DESC"
    );

    const poList = result.data;

    // Fetch items for each PO
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

    return {
      list: poList,
      totalCount: result.pagination.total
    };
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
        bomId: data.bomId,
        bomSectionId: data.bomSectionId || null,
        supplierId: data.supplierId,
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
      `SELECT poi.*, ig.name as itemGroupName, u.name as uomName, m.name as materialName
       FROM tbl_purchase_order_items poi
       LEFT JOIN tbl_item_group ig ON poi.itemGroupId = ig.id
       LEFT JOIN tbl_uom u ON poi.uomId = u.id
       LEFT JOIN tbl_material m ON poi.materialId = m.id
       WHERE poi.poId = ?`,
      [id]
    );

    return {
      ...header[0],
      items
    };
  }
}

module.exports = PurchaseOrderModel;
