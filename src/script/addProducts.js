// scripts/importProducts.js
require("dotenv").config();
const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const Product = require("../models/product.model");
const Category = require("../models/category.model");

// ✅ MongoDB connection
const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://HariBomen:MySecrtePassword@cluster0.ho1md4e.mongodb.net/fs_interprises";

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// ✅ Utility functions
function isNullString(v) {
  return typeof v === "string" && v.trim().toUpperCase() === "NULL";
}

function toNumber(value, defaultValue = 0) {
  if (value === null || value === undefined) return defaultValue;
  if (isNullString(value)) return defaultValue;
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function toStringSafe(value, defaultValue = "") {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "object") return JSON.stringify(value);
  return value.toString().trim();
}

function pickFirst(keys, row) {
  for (const k of keys) {
    for (const col of Object.keys(row)) {
      if (col.trim().toLowerCase() === k.toLowerCase()) return row[col];
    }
  }
  return undefined;
}

// ✅ Main import logic
(async () => {
  try {
    const filePath = path.join(__dirname, "data.xlsx");
    console.log(`📘 Reading Excel file from: ${filePath}`);

    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    console.log(`📄 Loaded ${data.length} rows from Excel`);

    // 🔎 Detect category column
    const sampleRow = data.find(Boolean) || {};
    const possibleCatCols = [
      "Category",
      "category",
      "Dept",
      "Department",
      "Group",
      "Cat",
    ];
    let categoryColumn = null;
    for (const col of Object.keys(sampleRow)) {
      const lower = col.toLowerCase();
      if (
        possibleCatCols.includes(col) ||
        lower.includes("cat") ||
        lower.includes("dept") ||
        lower.includes("group")
      ) {
        categoryColumn = col;
        break;
      }
    }
    console.log(
      "🔎 Category column detected:",
      categoryColumn || "(none - using Default)"
    );

    const categoryCache = new Map();
    let successCount = 0;
    let failCount = 0;
    const failedRows = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      try {
        // 🔸 Get or create category
        let categoryName = "Default";
        if (categoryColumn && item[categoryColumn]) {
          categoryName = toStringSafe(item[categoryColumn], "Default");
        }
        let categoryDoc = categoryCache.get(categoryName);
        if (!categoryDoc) {
          categoryDoc = await Category.findOneAndUpdate(
            { name: categoryName },
            { name: categoryName },
            { upsert: true, new: true }
          );
          categoryCache.set(categoryName, categoryDoc);
        }

        // 🔸 Prepare variant
        const variant = {
          name: toStringSafe(item.ITEMDESC, "Unnamed Variant"),
          brand: "Unknown",
          price: toNumber(item.Mrp || item.InvoiceRate),
          stockQty: toNumber(item.stock),
          imageUrl: "N/A",
          itemCode: toStringSafe(item.ItemCode),
          spNo: toStringSafe(item.SPNO),
          uom: toStringSafe(item.UOM),
          defUom: toStringSafe(item.DefUom),
          itemOnFlag: toStringSafe(item.ItemonFlag),
          rackNo: toStringSafe(item.RackNo),
          opStock: toNumber(item.opstock),
          hsnCode: toStringSafe(item.HSNCODE),
          gst: toNumber(item.GST),
          stockItem: toStringSafe(item.StockItem),
          itemDisc: toNumber(item.ItemDisc),
          mrp: toNumber(item.Mrp),
          purRate: toNumber(item.purrate),
          invoiceRate: toNumber(item.InvoiceRate),
          cashMemoRate: toNumber(item.CashMemoRate),
          estimateRate: toNumber(item.EstimateRate),
          cashSalesRate: toNumber(item.CAshSalesRate),
          agRate: toNumber(item.AgRate),
          invDisc: toNumber(item.InvDisc),
          cashMemoDisc: toNumber(item.CashMemoDisc),
          estimateDisc: toNumber(item.EstimateDisc),
          agDisc: toNumber(item.AgDisc),
        };

        const productDoc = {
          name: toStringSafe(item.NAME, "Unnamed Product"),
          description: toStringSafe(item.ITEMDESC, "No description"),
          categoryId: categoryDoc._id,
          variants: [variant],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 🔸 Insert product safely
        try {
          await Product.collection.insertOne(productDoc);
          successCount++;
        } catch (err) {
          console.warn(
            `⚠️ Insert failed for row ${i + 1}: ${
              err.message
            }. Retrying minimal insert...`
          );
          // Retry with minimal safe version
          const safeDoc = {
            name: productDoc.name,
            description: productDoc.description,
            categoryId: productDoc.categoryId,
            variants: [
              {
                name: variant.name,
                brand: variant.brand,
                price: variant.price,
                stockQty: variant.stockQty,
              },
            ],
          };
          await Product.collection.insertOne(safeDoc);
          successCount++;
        }
      } catch (e) {
        failCount++;
        failedRows.push({ row: i + 1, error: e.message });
        console.warn(`⚠️ Row ${i + 1} failed: ${e.message}`);
      }
    }

    console.log(
      `\n✅ Import completed: ${successCount} inserted, ${failCount} failed.`
    );

    if (failCount > 0) {
      const debugFile = path.join(__dirname, "import_failed_rows.json");
      fs.writeFileSync(JSON.stringify(failedRows, null, 2), "utf8");
      console.log("📝 Failed rows written to:", debugFile);
    }
  } catch (err) {
    console.error("❌ Fatal import error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 MongoDB connection closed.");
    process.exit(0);
  }
})();
