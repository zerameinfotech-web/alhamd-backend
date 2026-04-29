const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping (not found): ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace CAST(... AS JSON) for IDs
    content = content.replace(/CAST\(id AS JSON\)/g, "CAST(id AS CHAR)");
    content = content.replace(/CAST\(ig\.id AS JSON\)/g, "CAST(ig.id AS CHAR)");
    
    // Replace CAST(CONCAT(...) AS JSON) for names
    content = content.replace(/CAST\(CONCAT\('"', name, '"'\) AS JSON\)/g, "JSON_QUOTE(name)");
    
    // Add COALESCE for safety
    content = content.replace(/JSON_CONTAINS\(s\.supplierType/g, "JSON_CONTAINS(COALESCE(s.supplierType, '[]')");
    content = content.replace(/JSON_CONTAINS\(s\.categoriesSupplied/g, "JSON_CONTAINS(COALESCE(s.categoriesSupplied, '[]')");
    content = content.replace(/JSON_CONTAINS\(a\.itemGroup/g, "JSON_CONTAINS(COALESCE(a.itemGroup, '[]')");
    
    fs.writeFileSync(filePath, content);
    console.log(`Successfully updated: ${filePath}`);
}

const articlePath = path.join(__dirname, '..', 'models', 'article.model.js');
const supplierPath = path.join(__dirname, '..', 'models', 'supplier.model.js');

fixFile(articlePath);
fixFile(supplierPath);
console.log("\nSQL syntax fixes complete.");
