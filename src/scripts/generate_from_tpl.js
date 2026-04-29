const fs = require('fs');
const path = require('path');

const masters = [
    { name: "customer", table: "tbl_customer", prefix: "CUST-", title: "Customer" },
    { name: "supplier", table: "tbl_supplier", prefix: "SUPP-", title: "Supplier" },
    { name: "article", table: "tbl_article", prefix: "ART-", title: "Article" },
    { name: "item-group", table: "tbl_item_group", prefix: "IG-", title: "Item Group" },
    { name: "material", table: "tbl_material", prefix: "MAT-", title: "Material" },
    { name: "colour", table: "tbl_colour", prefix: "COL-", title: "Colour" },
    { name: "size", table: "tbl_size", prefix: "SZ-", title: "Size" },
    { name: "uom", table: "tbl_uom", prefix: "UOM-", title: "UOM" },
    { name: "warehouse", table: "tbl_warehouse", prefix: "WH-", title: "Warehouse" },
    { name: "brand", table: "tbl_brand", prefix: "BR-", title: "Brand" }
];

const basePath = path.join(__dirname, '..');

const modelTpl = fs.readFileSync(path.join(__dirname, 'model.tpl'), 'utf8');
const controllerTpl = fs.readFileSync(path.join(__dirname, 'controller.tpl'), 'utf8');
const routesTpl = fs.readFileSync(path.join(__dirname, 'routes.tpl'), 'utf8');

masters.forEach(m => {
    const modelName = m.title.replace(/ /g, "");
    const render = (str) => {
        return str.replace(/\[\[TABLE\]\]/g, m.table)
                  .replace(/\[\[MODEL\]\]/g, modelName)
                  .replace(/\[\[PREFIX\]\]/g, m.prefix)
                  .replace(/\[\[NAME\]\]/g, m.name)
                  .replace(/\[\[TITLE\]\]/g, m.title);
    };

    fs.writeFileSync(path.join(basePath, 'models', m.name + '.model.js'), render(modelTpl));
    fs.writeFileSync(path.join(basePath, 'controllers', m.name + '.controller.js'), render(controllerTpl));
    fs.writeFileSync(path.join(basePath, 'routes', m.name + '.routes.js'), render(routesTpl));
    console.log("Generated API stack for " + m.title);
});
