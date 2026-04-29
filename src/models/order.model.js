const DatabaseUtils = require("../utils/database.utils");

const TABLE = "tbl_orders";
const ITEMS_TABLE = "tbl_order_items";

class OrderModel {
    static async generateNextCode() {
        const rows = await DatabaseUtils.query(
            `SELECT orderCode FROM ${TABLE} WHERE orderCode LIKE 'SO-%' ORDER BY id DESC LIMIT 1`
        );
        if (rows.length === 0) return 'SO-0001';
        const last = rows[0].orderCode;
        const numPart = last.replace('SO-', '');
        const nextNum = parseInt(numPart, 10) + 1;
        if (isNaN(nextNum)) return 'SO-0001';
        return 'SO-' + String(nextNum).padStart(4, '0');
    }

    static async create(data, items = []) {
        const { promisePool } = require("../config/database");
        const conn = await promisePool.getConnection();
        try {
            await conn.beginTransaction();
            const [orderResult] = await conn.execute(
                `INSERT INTO ${TABLE} (orderCode, orderName, orderDate, customerId, customerName, currency, currencyId, paymentTerms, paymentTermsId, unitPrice, deliveryDate, shipmentType, containerType, portOfDischarge, finalDestination, status, totalPairs, totalValue)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                 [data.orderCode, data.orderName || null, data.orderDate, data.customerId || null, data.customerName || null,
                 data.currency, data.currencyId || null, data.paymentTerms || null, data.paymentTermsId || null, data.unitPrice || 0,
                 data.deliveryDate, data.shipmentType || null, data.containerType || null,
                 data.portOfDischarge || null, data.finalDestination || null,
                 data.status || 'Draft', data.totalPairs || 0, data.totalValue || 0].map(v => DatabaseUtils._mapValue(v))
            );
            const orderId = orderResult.insertId;
            for (const item of items) {
                await conn.execute(
                    `INSERT INTO ${ITEMS_TABLE} (orderId, articleId, articleCode, articleName, itemGroup, itemGroupId, colour, colourId, sizeType, sizeQty, totalPairs, currency, unitPrice)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, item.articleId || null, item.articleCode || null, item.articleName || null,
                     item.itemGroup || null, item.itemGroupId || null, item.colour || null, item.colourId || null,
                     item.sizeType || null, item.sizeQty || null,
                     item.totalPairs || 0, item.currency || null, item.unitPrice || 0].map(v => DatabaseUtils._mapValue(v))
                );
            }
            await conn.commit();
            return orderId;
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    static async update(id, data, items = []) {
        const { promisePool } = require("../config/database");
        const conn = await promisePool.getConnection();
        try {
            await conn.beginTransaction();
            await conn.execute(
                `UPDATE ${TABLE} SET orderName=?, orderDate=?, customerId=?, customerName=?, currency=?, currencyId=?, paymentTerms=?, paymentTermsId=?, unitPrice=?, deliveryDate=?, shipmentType=?, containerType=?, portOfDischarge=?, finalDestination=?, status=?, totalPairs=?, totalValue=? WHERE id=?`,
                [data.orderName || null, data.orderDate, data.customerId || null, data.customerName || null,
                 data.currency, data.currencyId || null, data.paymentTerms || null, data.paymentTermsId || null, data.unitPrice || 0,
                 data.deliveryDate, data.shipmentType || null, data.containerType || null,
                 data.portOfDischarge || null, data.finalDestination || null,
                 data.status || 'Draft', data.totalPairs || 0, data.totalValue || 0, id].map(v => DatabaseUtils._mapValue(v))
            );
            await conn.execute(`DELETE FROM ${ITEMS_TABLE} WHERE orderId = ?`, [id]);
            for (const item of items) {
                await conn.execute(
                    `INSERT INTO ${ITEMS_TABLE} (orderId, articleId, articleCode, articleName, itemGroup, itemGroupId, colour, colourId, sizeType, sizeQty, totalPairs, currency, unitPrice)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [id, item.articleId || null, item.articleCode || null, item.articleName || null,
                     item.itemGroup || null, item.itemGroupId || null, item.colour || null, item.colourId || null,
                     item.sizeType || null, item.sizeQty || null,
                     item.totalPairs || 0, item.currency || null, item.unitPrice || 0].map(v => DatabaseUtils._mapValue(v))
                );
            }
            await conn.commit();
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    static async getById(id) {
        const [order] = await DatabaseUtils.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
        if (!order) return null;
        const items = await DatabaseUtils.query(`SELECT * FROM ${ITEMS_TABLE} WHERE orderId = ?`, [id]);
        return { ...order, items: items.map(parseItem) };
    }

    static async list(page = 1, limit = 10, searchTerm = "") {
        let where = "o.status != 'Deleted'";
        let params = [];
        if (searchTerm) {
            where += " AND (o.orderCode LIKE ? OR o.orderName LIKE ? OR o.customerName LIKE ? OR o.status LIKE ?)";
            const p = `%${searchTerm}%`;
            params.push(p, p, p, p);
        }
        
        const result = await DatabaseUtils.selectPaginated(
            `${TABLE} o 
             LEFT JOIN tbl_currency curr ON o.currencyId = curr.id
             LEFT JOIN tbl_payment_terms pt ON o.paymentTermsId = pt.id`,
            "o.*, curr.code as currencyCode, pt.name as paymentTermsName",
            where,
            params,
            page,
            limit,
            "o.id DESC"
        );

        const list = await Promise.all(result.data.map(async (o) => {
            const items = await DatabaseUtils.query(
                `SELECT i.*, ig.name as itemGroupName, c.name as colourName 
                 FROM ${ITEMS_TABLE} i 
                 LEFT JOIN tbl_item_group ig ON i.itemGroupId = ig.id
                 LEFT JOIN tbl_colour c ON i.colourId = c.id
                 WHERE i.orderId = ?`, 
                [o.id]
            );
            return { ...o, items: items.map(parseItem) };
        }));
        return { list, totalCount: result.pagination.total };
    }

    static async listForDropdown(searchTerm = "") {
        let where = "status != 'Deleted'";
        const params = [];

        if (searchTerm) {
            where += " AND (orderCode LIKE ? OR orderName LIKE ?)";
            const p = `%${searchTerm}%`;
            params.push(p, p);
        }

        return await DatabaseUtils.query(
            `SELECT id, orderCode, orderName
             FROM ${TABLE}
             WHERE ${where}
             ORDER BY id DESC`,
            params
        );
    }

    static async softDelete(id) {
        return await DatabaseUtils.update(TABLE, { status: 'Deleted' }, "id = ?", [id]);
    }
}

function parseItem(item) {
    if (typeof item.sizeQty === 'string') { try { item.sizeQty = JSON.parse(item.sizeQty); } catch { item.sizeQty = []; } }
    else if (!item.sizeQty) item.sizeQty = [];

    if (typeof item.itemGroup === 'string') { 
        try { 
            item.itemGroup = JSON.parse(item.itemGroup); 
            if (!Array.isArray(item.itemGroup)) item.itemGroup = [item.itemGroup];
        } catch { 
            item.itemGroup = item.itemGroup ? [item.itemGroup] : []; 
        } 
    }
    else if (!item.itemGroup) item.itemGroup = [];
    else if (!Array.isArray(item.itemGroup)) item.itemGroup = [item.itemGroup];
    
    return item;
}

module.exports = OrderModel;
