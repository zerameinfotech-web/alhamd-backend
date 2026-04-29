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
            supplierId: item.supplierId || null
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
            supplierId: item.supplierId || null
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

    const rows = await DatabaseUtils.query(
      `SELECT b.*,
       (SELECT GROUP_CONCAT(DISTINCT CONCAT(a.code, ' - ', a.name) SEPARATOR ' | ')
        FROM tbl_article a, tbl_bom_sections s
        WHERE s.bomId = b.id AND a.id = COALESCE(s.articleId, b.articleId)) as articleName,
       (SELECT COUNT(*) FROM tbl_bom_items WHERE bomId = b.id) as lineCount
       FROM tbl_bom b
       ORDER BY b.id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const total = await DatabaseUtils.count("tbl_bom");

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
              sea.name as seasonName, col.name as colourName
         FROM tbl_bom_sections s
         LEFT JOIN tbl_article a ON a.id = COALESCE(s.articleId, ?)
         LEFT JOIN tbl_season sea ON s.seasonId = sea.id
         LEFT JOIN tbl_colour col ON s.colourId = col.id
         WHERE s.bomId = ?`,
      [bom.articleId, id]
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

  async delete(id) {
    const affected = await DatabaseUtils.hardDelete("tbl_bom", "id = ?", [id]);
    return affected > 0;
  }
};

module.exports = BOM;
