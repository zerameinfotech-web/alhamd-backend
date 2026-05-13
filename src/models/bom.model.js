const DatabaseUtils = require("../utils/database.utils");

const BOM = {
  async generateCode() {
    const rows = await DatabaseUtils.query(
      "SELECT bomCode FROM tbl_bom ORDER BY id DESC LIMIT 1"
    );
    if (rows.length === 0) return "BOM-0001";
    const lastCode = rows[0].bomCode;
    const match = lastCode.match(/\d+/);
    const lastNum = match ? parseInt(match[0], 10) : 0;
    const newNum = lastNum + 1;
    return `BOM-${String(newNum).padStart(4, '0')}`;
  },

  async create(bomData) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Insert Header
      const bomId = await DatabaseUtils.insert("tbl_bom", {
        bomCode: bomData.bomCode,
        articleId: bomData.articleId,
        version: bomData.version || 'V1',
        effDate: bomData.effDate || null,
        status: bomData.status || 'Draft'
      }, connection);

      // 2. Insert Sections
      for (const section of bomData.sections) {
        const sectionId = await DatabaseUtils.insert("tbl_bom_sections", {
          bomId,
          articleId: section.articleId || null,
          orderId: section.orderId || null,
          priceType: section.priceType || 'Without GST',
          style: section.style || null,
          colour: section.color || null,
          colourId: section.colourId || null,
          season: section.season || null,
          seasonId: section.seasonId || null,
          lastNo: section.lastNo || null,
          baseSize: section.baseSize || null,
          bomDate: section.date || null,
          deliveryDate: section.delivery || null
        }, connection);

        // 3. Insert Items
        for (const item of section.items) {
          const itemId = await DatabaseUtils.insert("tbl_bom_items", {
            sectionId,
            bomId,
            itemGroupId: item.itemGroupId || null,
            itemCode: item.itemCode || null,
            materialId: item.materialId || null,
            description: item.description || null,
            color: item.color || null,
            uomId: item.uomId || null,
            norms: item.norms || 0,
            orderQty: item.orderQty || 0,
            requiredQty: item.requiredQty || 0,
            price: item.price || 0,
            gstSlab: item.gstSlab || '0%',
            gstPrice: item.gstPrice || 0,
            totalPrice: item.totalPrice || 0,
            supplierId: item.supplierId || null,
            materialType: item.materialType || 'Local',
            dutyPercentage: item.dutyPercentage || 0,
            dutyAmount: item.dutyAmount || 0,
            clearingPercentage: item.clearingPercentage || 0,
            clearingAmount: item.clearingAmount || 0
          }, connection);

          if (item.sizeNorms && Array.isArray(item.sizeNorms)) {
            for (const sn of item.sizeNorms) {
              await DatabaseUtils.insert("tbl_bom_item_size_norms", {
                itemId,
                size: sn.size,
                norm: sn.norm || 0
              }, connection);
            }
          }
        }
      }

      return { id: bomId, bomCode: bomData.bomCode };
    });
  },

  async update(id, bomData) {
    return await DatabaseUtils.executeTransaction(async (connection) => {
      // 1. Update Header
      await DatabaseUtils.update("tbl_bom", {
        articleId: bomData.articleId,
        version: bomData.version,
        effDate: bomData.effDate,
        status: bomData.status
      }, "id = ?", [id], connection);

      // 2. Clear existing sections and items (Ensure norms cascade)
      await DatabaseUtils.query("DELETE FROM tbl_bom_sections WHERE bomId = ?", [id], connection);
      await DatabaseUtils.query("DELETE FROM tbl_bom_items WHERE bomId = ?", [id], connection);

      // 3. Re-insert Sections and Items
      for (const section of bomData.sections) {
        const sectionId = await DatabaseUtils.insert("tbl_bom_sections", {
          bomId: id,
          articleId: section.articleId || null,
          orderId: section.orderId || null,
          priceType: section.priceType || 'Without GST',
          style: section.style || null,
          colour: section.color || null,
          colourId: section.colourId || null,
          season: section.season || null,
          seasonId: section.seasonId || null,
          lastNo: section.lastNo || null,
          baseSize: section.baseSize || null,
          bomDate: section.date || null,
          deliveryDate: section.delivery || null
        }, connection);

        for (const item of section.items) {
          const itemId = await DatabaseUtils.insert("tbl_bom_items", {
            sectionId,
            bomId: id,
            itemGroupId: item.itemGroupId || null,
            itemCode: item.itemCode || null,
            materialId: item.materialId || null,
            description: item.description || null,
            color: item.color || null,
            uomId: item.uomId || null,
            norms: item.norms || 0,
            orderQty: item.orderQty || 0,
            requiredQty: item.requiredQty || 0,
            price: item.price || 0,
            gstSlab: item.gstSlab || '0%',
            gstPrice: item.gstPrice || 0,
            totalPrice: item.totalPrice || 0,
            supplierId: item.supplierId || null,
            materialType: item.materialType || 'Local',
            dutyPercentage: item.dutyPercentage || 0,
            dutyAmount: item.dutyAmount || 0,
            clearingPercentage: item.clearingPercentage || 0,
            clearingAmount: item.clearingAmount || 0
          }, connection);

          if (item.sizeNorms && Array.isArray(item.sizeNorms)) {
            for (const sn of item.sizeNorms) {
              await DatabaseUtils.insert("tbl_bom_item_size_norms", {
                itemId,
                size: sn.size,
                norm: sn.norm || 0
              }, connection);
            }
          }
        }
      }

      return { id };
    });
  },

  async getAll(filters = {}) {
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = (filters.searchTerm || filters.search || '').trim();
    const orderId = filters.orderId ? Number(filters.orderId) : null;

    const whereParts = ['1=1'];
    const params = [];

    if (orderId) {
      whereParts.push('EXISTS (SELECT 1 FROM tbl_bom_sections s WHERE s.bomId = b.id AND s.orderId = ?)');
      params.push(orderId);
    }

    if (searchTerm) {
      const pat = `%${searchTerm}%`;
      whereParts.push(`(
        b.bomCode LIKE ?
        OR EXISTS (SELECT 1 FROM tbl_article a, tbl_bom_sections s WHERE s.bomId = b.id AND a.id = COALESCE(s.articleId, b.articleId) AND (a.code LIKE ? OR a.name LIKE ?))
        OR EXISTS (SELECT 1 FROM tbl_bom_sections s LEFT JOIN tbl_orders o ON o.id = s.orderId WHERE s.bomId = b.id AND (o.orderCode LIKE ? OR o.orderName LIKE ?))
      )`);
      params.push(pat, pat, pat, pat, pat);
    }

    const whereSql = whereParts.join(' AND ');

    const rows = await DatabaseUtils.query(
      `SELECT b.*,
       (SELECT GROUP_CONCAT(DISTINCT CONCAT(a.code, ' - ', a.name) SEPARATOR ' | ')
        FROM tbl_article a, tbl_bom_sections s
        WHERE s.bomId = b.id AND a.id = COALESCE(s.articleId, b.articleId)) as articleName,
       (SELECT COUNT(*) FROM tbl_bom_items WHERE bomId = b.id) as lineCount,
       (SELECT GROUP_CONCAT(DISTINCT CONCAT(o.orderCode, IFNULL(CONCAT(' - ', NULLIF(o.orderName, '')), '')) SEPARATOR ' | ')
        FROM tbl_bom_sections s
        LEFT JOIN tbl_orders o ON o.id = s.orderId
        WHERE s.bomId = b.id AND s.orderId IS NOT NULL) as orderCodes,
       (SELECT GROUP_CONCAT(DISTINCT s.orderId)
        FROM tbl_bom_sections s
        WHERE s.bomId = b.id AND s.orderId IS NOT NULL) as orderIds
       FROM tbl_bom b
       WHERE ${whereSql}
       ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const totalRows = await DatabaseUtils.query(
      `SELECT COUNT(*) as cnt FROM tbl_bom b WHERE ${whereSql}`,
      params
    );
    const total = totalRows[0]?.cnt || 0;

    return {
      list: rows,
      totalCount: total
    };
  },

  async getById(id) {
    const rows = await DatabaseUtils.query(
      `SELECT b.*, a.name as articleName, a.code as articleCode FROM tbl_bom b LEFT JOIN tbl_article a ON b.articleId = a.id WHERE b.id = ?`,
      [id]
    );
    if (rows.length === 0) return null;

    const bom = rows[0];

    // Get Sections (fallback to BOM header articleId for old records)
    const sections = await DatabaseUtils.query(
      `SELECT s.*, a.id as art_id, a.name as art_name, a.code as art_code, a.style as art_style, a.defaultColour as art_colour, a.season as art_season, a.itemGroup as art_itemGroup, a.sizeGroupId as art_sizeGroupId,
              sea.name as seasonName, col.name as colourName,
              (SELECT COALESCE(c2.name, oi.colour)
                 FROM tbl_order_items oi
                 LEFT JOIN tbl_colour c2 ON oi.colourId = c2.id
                 WHERE oi.orderId = s.orderId AND oi.articleId = COALESCE(s.articleId, ?)
                 LIMIT 1) AS orderColour
         FROM tbl_bom_sections s
         LEFT JOIN tbl_article a ON a.id = COALESCE(s.articleId, ?)
         LEFT JOIN tbl_season sea ON s.seasonId = sea.id
         LEFT JOIN tbl_colour col ON s.colourId = col.id
         WHERE s.bomId = ?`,
      [bom.articleId, bom.articleId, id]
    );

    const FileUtils = require("../utils/file.utils");

    for (let section of sections) {
      const dbItems = await DatabaseUtils.query("SELECT * FROM tbl_bom_items WHERE sectionId = ?", [section.id]);

      section.items = await Promise.all(dbItems.map(async (i) => {
        const sizeNorms = await DatabaseUtils.query(
          "SELECT size, norm FROM tbl_bom_item_size_norms WHERE itemId = ?",
          [i.id]
        );
        return { ...i, sizeNorms };
      }));

      // Build articleInfo from joined fields
      if (section.art_id) {
        // Fetch actual attachments from attachment tables
        const { TABLES } = require("../config/constants");
        const attachments = await DatabaseUtils.query(
          `SELECT ad.id, ad.url, ad.fileName, ad.type
                 FROM ${TABLES.ATTACHMENT_DETAILS} ad
                 INNER JOIN ${TABLES.ENTITY_ATTACHMENT} ea ON ad.id = ea.attachmentId
                 WHERE ea.entityId = ? AND ea.entityType = ?
                 ORDER BY ad.createdAt DESC`,
          [section.art_id, 'articleImage']
        );

        section.articleInfo = {
          id: section.art_id,
          name: section.art_name,
          code: section.art_code,
          style: section.art_style,
          colour: section.art_colour,
          season: section.art_season,
          itemGroup: section.art_itemGroup,
          sizeGroupId: section.art_sizeGroupId,
          image: attachments[0] ? FileUtils.getFileUrl(attachments[0].url) : null,
          articleImage: attachments.map(att => ({
            uid: String(att.id),
            name: att.fileName,
            status: 'done',
            url: FileUtils.getFileUrl(att.url)
          }))
        };
      } else {
        section.articleInfo = null;
      }
    }

    bom.sections = sections;
    return bom;
  },

  async getByOrders(orderIds) {
    if (!Array.isArray(orderIds) || orderIds.length === 0) return [];
    const placeholders = orderIds.map(() => '?').join(',');

    const rows = await DatabaseUtils.query(
      `SELECT s.orderId, o.orderCode, o.orderName,
              b.id as bomId, b.bomCode, b.version, b.status, b.effDate,
              (SELECT GROUP_CONCAT(DISTINCT CONCAT(a.code, ' - ', a.name) SEPARATOR ' | ')
               FROM tbl_article a, tbl_bom_sections s2
               WHERE s2.bomId = b.id AND a.id = COALESCE(s2.articleId, b.articleId)) as articleName,
              (SELECT COUNT(*) FROM tbl_bom_items WHERE bomId = b.id) as lineCount
         FROM tbl_bom_sections s
         INNER JOIN tbl_bom b ON b.id = s.bomId
         LEFT JOIN tbl_orders o ON o.id = s.orderId
        WHERE s.orderId IN (${placeholders})
        GROUP BY s.orderId, b.id
        ORDER BY s.orderId, b.id DESC`,
      orderIds
    );

    const bomIds = Array.from(new Set(rows.map(r => Number(r.bomId))));
    const vendorsPerBOM = new Map();
    const coveredPerBOM = new Map();
    if (bomIds.length > 0) {
      const phIds = bomIds.map(() => '?').join(',');
      const vendorRows = await DatabaseUtils.query(
        `SELECT bi.bomId, bi.supplierId
           FROM tbl_bom_items bi
          WHERE bi.bomId IN (${phIds}) AND bi.supplierId IS NOT NULL
          GROUP BY bi.bomId, bi.supplierId`,
        bomIds
      );
      for (const v of vendorRows) {
        const bid = Number(v.bomId);
        if (!vendorsPerBOM.has(bid)) vendorsPerBOM.set(bid, new Set());
        vendorsPerBOM.get(bid).add(Number(v.supplierId));
      }
      const poRows = await DatabaseUtils.query(
        `SELECT bomId, supplierId
           FROM tbl_purchase_order
          WHERE bomId IN (${phIds}) AND status NOT IN ('Cancelled')`,
        bomIds
      );
      for (const p of poRows) {
        const bid = Number(p.bomId);
        if (!coveredPerBOM.has(bid)) coveredPerBOM.set(bid, new Set());
        coveredPerBOM.get(bid).add(Number(p.supplierId));
      }
    }

    const groupMap = new Map();
    for (const r of rows) {
      const oid = Number(r.orderId);
      const bid = Number(r.bomId);
      const allVendors = vendorsPerBOM.get(bid) || new Set();
      const covered = coveredPerBOM.get(bid) || new Set();
      const fullyCovered = allVendors.size > 0 && Array.from(allVendors).every(v => covered.has(v));
      if (fullyCovered) continue;

      if (!groupMap.has(oid)) {
        groupMap.set(oid, {
          orderId: oid,
          orderCode: r.orderCode || `Order #${oid}`,
          orderName: r.orderName || '',
          boms: []
        });
      }
      groupMap.get(oid).boms.push({
        id: bid,
        bomCode: r.bomCode,
        version: r.version,
        status: r.status,
        effDate: r.effDate,
        articleName: r.articleName,
        lineCount: r.lineCount,
        vendorIds: Array.from(allVendors),
        coveredVendorIds: Array.from(covered)
      });
    }

    return orderIds.map(id => groupMap.get(Number(id)) || { orderId: Number(id), orderCode: `Order #${id}`, orderName: '', boms: [] });
  },

  async delete(id) {
    const poRows = await DatabaseUtils.query(
      "SELECT COUNT(*) as cnt FROM tbl_purchase_order WHERE bomId = ?",
      [id]
    );
    const poCount = Number(poRows[0]?.cnt || 0);
    if (poCount > 0) {
      const err = new Error(`Cannot delete BOM. ${poCount} Purchase Order(s) are linked to this BOM. Delete or unlink the POs first.`);
      err.code = 'BOM_HAS_POS';
      throw err;
    }
    return await DatabaseUtils.executeTransaction(async (connection) => {
      await DatabaseUtils.query("DELETE FROM tbl_bom_item_size_norms WHERE itemId IN (SELECT id FROM tbl_bom_items WHERE bomId = ?)", [id], connection);
      await DatabaseUtils.query("DELETE FROM tbl_bom_items WHERE bomId = ?", [id], connection);
      await DatabaseUtils.query("DELETE FROM tbl_bom_sections WHERE bomId = ?", [id], connection);
      const result = await DatabaseUtils.query("DELETE FROM tbl_bom WHERE id = ?", [id], connection);
      return result.affectedRows > 0;
    });
  }
};

module.exports = BOM;
