const DatabaseUtils = require("../utils/database.utils");

const MRPModel = {
    async runByOrder(orderId) {
        const required = await DatabaseUtils.query(
            `SELECT bi.materialId, m.name as materialName, m.code as materialCode,
                    bi.color, bi.uomId, u.name as uomName,
                    SUM(bi.requiredQty) as requiredQty,
                    bi.supplierId, sup.name as supplierName,
                    sup.leadTimeDays
               FROM tbl_bom_items bi
               INNER JOIN tbl_bom_sections bs ON bs.id = bi.sectionId
               LEFT JOIN tbl_material m ON m.id = bi.materialId
               LEFT JOIN tbl_uom u ON u.id = bi.uomId
               LEFT JOIN tbl_supplier sup ON sup.id = bi.supplierId
              WHERE bs.orderId = ?
              GROUP BY bi.materialId, bi.color, bi.uomId, bi.supplierId`,
            [orderId]
        );

        const ordered = await DatabaseUtils.query(
            `SELECT poi.materialId, poi.color, SUM(poi.orderQty) as orderedQty
               FROM tbl_purchase_order_items poi
              WHERE poi.orderId = ?
              GROUP BY poi.materialId, poi.color`,
            [orderId]
        );

        const received = await DatabaseUtils.query(
            `SELECT poi.materialId, poi.color, SUM(gi.receivedQty) as receivedQty
               FROM tbl_grn_items gi
               INNER JOIN tbl_grn g ON g.id = gi.grnId
               INNER JOIN tbl_purchase_order po ON po.poNo = g.poNo
               INNER JOIN tbl_purchase_order_items poi ON poi.poId = po.id
                    AND poi.materialId = gi.material_id
                    AND COALESCE(poi.color,'') = COALESCE(gi.color,'')
              WHERE poi.orderId = ?
              GROUP BY poi.materialId, poi.color`,
            [orderId]
        );

        const stock = await DatabaseUtils.query(
            `SELECT materialId, SUM(quantity) as availableStock
               FROM tbl_inventory
              WHERE stockStatus IS NULL OR stockStatus = 'Accepted'
              GROUP BY materialId`
        );
        const stockMap = new Map();
        stock.forEach(s => stockMap.set(Number(s.materialId), Number(s.availableStock || 0)));

        const map = new Map();
        const keyOf = (mid, c) => `${Number(mid)}-${(c || '').trim().toLowerCase()}`;

        required.forEach(r => {
            const k = keyOf(r.materialId, r.color);
            map.set(k, {
                key: k,
                materialId: r.materialId,
                materialName: r.materialName || '-',
                materialCode: r.materialCode || '',
                color: r.color || '',
                uomId: r.uomId,
                uomName: r.uomName || '',
                supplierId: r.supplierId,
                supplierName: r.supplierName || '',
                leadTimeDays: Number(r.leadTimeDays || 0),
                requiredQty: Number(r.requiredQty || 0),
                orderedQty: 0,
                receivedQty: 0,
                availableStock: stockMap.get(Number(r.materialId)) || 0,
            });
        });

        ordered.forEach(o => {
            const k = keyOf(o.materialId, o.color);
            if (!map.has(k)) {
                map.set(k, {
                    key: k, materialId: o.materialId, materialName: '-', color: o.color || '',
                    uomName: '', supplierName: '', leadTimeDays: 0,
                    requiredQty: 0, orderedQty: 0, receivedQty: 0,
                    availableStock: stockMap.get(Number(o.materialId)) || 0,
                });
            }
            map.get(k).orderedQty = Number(o.orderedQty || 0);
        });

        received.forEach(rc => {
            const k = keyOf(rc.materialId, rc.color);
            if (!map.has(k)) {
                map.set(k, {
                    key: k, materialId: rc.materialId, materialName: '-', color: rc.color || '',
                    uomName: '', supplierName: '', leadTimeDays: 0,
                    requiredQty: 0, orderedQty: 0, receivedQty: 0,
                    availableStock: stockMap.get(Number(rc.materialId)) || 0,
                });
            }
            map.get(k).receivedQty = Number(rc.receivedQty || 0);
        });

        return Array.from(map.values()).map(r => {
            const balanceToOrder = Math.max(0, r.requiredQty - r.orderedQty);
            const balanceToReceive = Math.max(0, r.orderedQty - r.receivedQty);
            const shortageQty = Math.max(0, r.requiredQty - r.receivedQty - (r.availableStock || 0));
            let status = 'Not Ready';
            if (r.requiredQty > 0 && (r.receivedQty + (r.availableStock || 0)) >= r.requiredQty) status = 'Ready';
            else if (r.receivedQty > 0 || r.orderedQty > 0) status = 'Partial';
            return { ...r, balanceToOrder, balanceToReceive, shortageQty, status };
        });
    },
};

module.exports = MRPModel;
