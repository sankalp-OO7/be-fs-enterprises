const mongoose = require("mongoose");
const Product = require("../models/product.model");
const Variant = require("../models/variant.model");
const Category = require("../models/category.model");
const XLSX = require("xlsx");
/**
 * Bulk import products and variants from Excel/JSON format
 * Expected data format:
 * {
 *   "productsData": [
 *     {
 *       "productName": "Hammer",
 *       "description": "Heavy duty hammer",
 *       "category": "Tools",
 *       "imageUrl": "https://...",
 *       "variants": [
 *         {
 *           "variantName": "Steel Hammer 500g",
 *           "variantPrice": 450,
 *           "brand": "Bosch",
 *           "stockQty": 100,
 *           "itemCode": 1001,
 *           ... other excel fields
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
exports.bulkImportProducts = async (req, res) => {
  try {
    const { productsData } = req.body;

    // Validate input data structure
    if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid data format. Expected { productsData: [] } with array of products"
      });
    }

    // Initialize results tracker
    const importResults = {
      totalRecordsProcessed: 0,
      summary: {
        categories: { created: 0, existing: 0 },
        products: { created: 0, updated: 0, skipped: 0 },
        variants: { created: 0, updated: 0, skipped: 0 }
      },
      errors: []
    };

    console.log(`🔄 Starting import of ${productsData.length} product records...`);

    // Process each product record
    for (const productRecord of productsData) {
      try {
        importResults.totalRecordsProcessed++;

        // Extract product data with clear field names
        const {
          productName,
          description = "",
          imageUrl = "",
          category, // Category name (required)
          categoryId, // Optional: Existing category ID
          variants = [] // Array of variant objects
        } = productRecord;

        // VALIDATION: Check required fields for product
        if (!productName || productName.trim() === "") {
          importResults.errors.push(`Record ${importResults.totalRecordsProcessed}: productName is required`);
          importResults.summary.products.skipped++;
          continue;
        }

        if (!category && !categoryId) {
          importResults.errors.push(`Product "${productName}": category or categoryId is required`);
          importResults.summary.products.skipped++;
          continue;
        }

        // VALIDATION: Check if variants array exists and has items
        if (!variants || !Array.isArray(variants) || variants.length === 0) {
          importResults.errors.push(`Product "${productName}": At least one variant is required`);
          importResults.summary.products.skipped++;
          continue;
        }

        // STEP 1: HANDLE CATEGORY
        let categoryDoc;
        try {
          if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            // Use existing category by ID
            categoryDoc = await Category.findById(categoryId);
            if (!categoryDoc) {
              throw new Error(`Category ID ${categoryId} not found`);
            }
            importResults.summary.categories.existing++;
          } else if (category) {
            // Find or create category by name
            const categoryName = category.trim();
            categoryDoc = await Category.findOneAndUpdate(
              { name: categoryName },
              { name: categoryName },
              { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true 
              }
            );
            
            if (categoryDoc.$isNew) {
              importResults.summary.categories.created++;
              console.log(`📁 Created new category: ${categoryName}`);
            } else {
              importResults.summary.categories.existing++;
            }
          }
        } catch (categoryError) {
          importResults.errors.push(`Product "${productName}": ${categoryError.message}`);
          importResults.summary.products.skipped++;
          continue;
        }

        // STEP 2: HANDLE PRODUCT - Find or Create
        let productDoc;
        const normalizedProductName = productName.trim();
        
        try {
          // Search for existing product by name + category combination
          const existingProduct = await Product.findOne({
            productName: normalizedProductName,
            categoryId: categoryDoc._id
          });

          if (existingProduct) {
            // UPDATE EXISTING PRODUCT
            existingProduct.description = description || existingProduct.description;
            existingProduct.imageUrl = imageUrl || existingProduct.imageUrl;
            productDoc = await existingProduct.save();
            importResults.summary.products.updated++;
            console.log(`🔄 Updated existing product: ${productDoc.productName}`);
          } else {
            // CREATE NEW PRODUCT
            productDoc = new Product({
              productName: normalizedProductName,
              description: description.trim(),
              imageUrl: imageUrl,
              categoryId: categoryDoc._id
            });
            await productDoc.save();
            importResults.summary.products.created++;
            console.log(`✅ Created new product: ${productDoc.productName} in category: ${categoryDoc.name}`);
          }
        } catch (productError) {
          importResults.errors.push(`Product "${productName}": ${productError.message}`);
          importResults.summary.products.skipped++;
          continue;
        }

        // STEP 3: PROCESS VARIANTS FOR THIS PRODUCT
        console.log(`   Processing ${variants.length} variants for ${productDoc.productName}...`);
        
        let variantResults = {
          created: 0,
          updated: 0,
          skipped: 0
        };

        for (const variantRecord of variants) {
          try {
            // Extract variant data with clear field names
            const {
              variantName,
              variantPrice,
              brand = "",
              stockQty = 0,
              imageUrl: variantImageUrl = productDoc.imageUrl || "",
              
              // Excel-specific fields
              itemCode,
              spNo,
              uom,
              defUom,
              itemOnFlag = false,
              rackNo = "",
              opStock = 0,
              hsnCode,
              gst = 0,
              stockItem = "",
              itemDisc = "",
              mrp,
              purRate,
              invoiceRate,
              cashMemoRate,
              estimateRate,
              cashSalesRate,
              agRate,
              invDisc = 0,
              cashMemoDisc = 0,
              estimateDisc = 0,
              agDisc = 0
            } = variantRecord;

            // VALIDATE VARIANT DATA
            if (!variantName || variantName.trim() === "") {
              throw new Error("variantName is required");
            }

            const normalizedVariantName = variantName.trim();
            const price = parseFloat(variantPrice);
            
            if (isNaN(price) || price < 0) {
              throw new Error(`Invalid variantPrice: ${variantPrice}`);
            }

            // Determine if variant already exists
            let existingVariant;
            
            // Priority 1: Search by itemCode (unique Excel identifier)
            if (itemCode) {
              existingVariant = await Variant.findOne({ 
                productId: productDoc._id,
                itemCode: itemCode 
              });
            }
            
            // Priority 2: Search by variantName + brand combination
            if (!existingVariant) {
              existingVariant = await Variant.findOne({ 
                productId: productDoc._id,
                variantName: normalizedVariantName,
                brand: brand || { $exists: false }
              });
            }

            if (existingVariant) {
              // UPDATE EXISTING VARIANT
              existingVariant.variantName = normalizedVariantName;
              existingVariant.variantPrice = price;
              existingVariant.actualPrice = price;
              existingVariant.brand = brand || existingVariant.brand;
              existingVariant.stockQty = stockQty || existingVariant.stockQty;
              existingVariant.imageUrl = variantImageUrl || existingVariant.imageUrl;
              
              // Update Excel fields if provided
              const excelFields = {
                itemCode, spNo, uom, defUom, rackNo, opStock,
                hsnCode, gst, stockItem, itemDisc, mrp, purRate,
                invoiceRate, cashMemoRate, estimateRate, cashSalesRate,
                agRate, invDisc, cashMemoDisc, estimateDisc, agDisc
              };
              
              Object.keys(excelFields).forEach(field => {
                if (excelFields[field] !== undefined) {
                  existingVariant[field] = excelFields[field];
                }
              });
              
              if (itemOnFlag !== undefined) existingVariant.itemOnFlag = itemOnFlag;

              await existingVariant.save();
              variantResults.updated++;
              console.log(`     ↳ Updated variant: ${normalizedVariantName} (₹${price})`);
            } else {
              // CREATE NEW VARIANT
              const newVariant = new Variant({
                productId: productDoc._id,
                variantName: normalizedVariantName,
                variantPrice: price,
                actualPrice: price,
                brand: brand,
                stockQty: stockQty,
                imageUrl: variantImageUrl,
                
                // Excel fields with defaults
                itemCode: itemCode || null,
                spNo: spNo || null,
                uom: uom || "",
                defUom: defUom || "",
                itemOnFlag: itemOnFlag,
                rackNo: rackNo,
                opStock: opStock,
                hsnCode: hsnCode || null,
                gst: gst,
                stockItem: stockItem,
                itemDisc: itemDisc,
                mrp: mrp || price,
                purRate: purRate || price,
                invoiceRate: invoiceRate || price,
                cashMemoRate: cashMemoRate || price,
                estimateRate: estimateRate || price,
                cashSalesRate: cashSalesRate || price,
                agRate: agRate || price,
                invDisc: invDisc,
                cashMemoDisc: cashMemoDisc,
                estimateDisc: estimateDisc,
                agDisc: agDisc
              });

              await newVariant.save();
              variantResults.created++;
              console.log(`     ↳ Created variant: ${normalizedVariantName} (₹${price})`);
            }

          } catch (variantError) {
            const errorMsg = `Product "${productDoc.productName}", Variant error: ${variantError.message}`;
            importResults.errors.push(errorMsg);
            variantResults.skipped++;
            console.log(`     ❌ Error: ${variantError.message}`);
          }
        }

        // Update overall variant results
        importResults.summary.variants.created += variantResults.created;
        importResults.summary.variants.updated += variantResults.updated;
        importResults.summary.variants.skipped += variantResults.skipped;

        console.log(`   ✓ Variants summary: ${variantResults.created} created, ${variantResults.updated} updated, ${variantResults.skipped} skipped`);

      } catch (recordError) {
        importResults.errors.push(`Record ${importResults.totalRecordsProcessed}: ${recordError.message}`);
        importResults.summary.products.skipped++;
      }
    }

    // Prepare final response
    const response = {
      success: true,
      message: "Bulk import completed successfully",
      timestamp: new Date().toISOString(),
      results: {
        totalProcessed: importResults.totalRecordsProcessed,
        categories: importResults.summary.categories,
        products: importResults.summary.products,
        variants: importResults.summary.variants,
        totalErrors: importResults.errors.length,
        successRate: calculateSuccessRate(importResults)
      }
    };

    // Include errors if any (limit to first 10)
    if (importResults.errors.length > 0) {
      response.errors = importResults.errors.slice(0, 10);
      if (importResults.errors.length > 10) {
        response.moreErrors = `${importResults.errors.length - 10} more errors not shown`;
      }
    }

    console.log(`🎉 Import completed! Summary:`);
    console.log(`   Products: ${importResults.summary.products.created} created, ${importResults.summary.products.updated} updated`);
    console.log(`   Variants: ${importResults.summary.variants.created} created, ${importResults.summary.variants.updated} updated`);
    console.log(`   Errors: ${importResults.errors.length}`);

    res.status(200).json(response);

  } catch (error) {
    console.error("❌ Import failed:", error);
    res.status(500).json({
      success: false,
      message: "Import process failed",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Validate import data before processing
 * Helps users check if their data format is correct
 */
exports.validateImportData = async (req, res) => {
  try {
    const { productsData } = req.body;

    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      statistics: {
        totalProducts: 0,
        totalVariants: 0,
        uniqueCategories: new Set(),
        sampleProduct: null
      }
    };

    // Basic validation
    if (!productsData || !Array.isArray(productsData)) {
      validationResult.isValid = false;
      validationResult.errors.push("Data must be an array of products in 'productsData' field");
      return res.status(400).json(validationResult);
    }

    validationResult.statistics.totalProducts = productsData.length;

    // Validate each product
    productsData.forEach((product, index) => {
      const recordNumber = index + 1;
      
      // Check required product fields
      if (!product.productName) {
        validationResult.errors.push(`Record ${recordNumber}: 'productName' is required`);
        validationResult.isValid = false;
      }

      if (!product.category && !product.categoryId) {
        validationResult.errors.push(`Product "${product.productName || recordNumber}": 'category' or 'categoryId' is required`);
        validationResult.isValid = false;
      } else if (product.category) {
        validationResult.statistics.uniqueCategories.add(product.category);
      }

      // Check variants
      if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
        validationResult.errors.push(`Product "${product.productName || recordNumber}": 'variants' array is required with at least one variant`);
        validationResult.isValid = false;
      } else {
        validationResult.statistics.totalVariants += product.variants.length;
        
        // Validate each variant
        product.variants.forEach((variant, vIndex) => {
          if (!variant.variantName) {
            validationResult.errors.push(`Product "${product.productName}", Variant ${vIndex + 1}: 'variantName' is required`);
            validationResult.isValid = false;
          }
          
          if (variant.variantPrice === undefined || variant.variantPrice === null) {
            validationResult.errors.push(`Product "${product.productName}", Variant "${variant.variantName}": 'variantPrice' is required`);
            validationResult.isValid = false;
          } else if (isNaN(parseFloat(variant.variantPrice))) {
            validationResult.errors.push(`Product "${product.productName}", Variant "${variant.variantName}": 'variantPrice' must be a number`);
            validationResult.isValid = false;
          }
        });
      }

      // Store first valid product as sample
      if (!validationResult.statistics.sampleProduct && product.productName && product.category && product.variants) {
        validationResult.statistics.sampleProduct = {
          productName: product.productName,
          category: product.category,
          variantCount: product.variants.length
        };
      }
    });

    // Convert Set to Array for JSON response
    validationResult.statistics.uniqueCategories = Array.from(validationResult.statistics.uniqueCategories);

    // Add warnings for common issues
    if (validationResult.statistics.totalProducts > 100) {
      validationResult.warnings.push("Large dataset detected. Consider splitting into multiple imports.");
    }

    res.status(200).json(validationResult);

  } catch (error) {
    res.status(400).json({
      isValid: false,
      errors: [`Validation error: ${error.message}`]
    });
  }
};

/**
 * Get import template/structure
 * Helps users understand the required format
 */
exports.getImportTemplate = async (req, res) => {
  try {
    const template = {
      description: "Template for bulk product and variant import",
      requiredFormat: {
        productsData: [
          {
            productName: "string (required)",
            description: "string (optional)",
            imageUrl: "string (optional)",
            category: "string (required) - OR use categoryId",
            categoryId: "string (optional) - Existing category ID",
            variants: [
              {
                variantName: "string (required)",
                variantPrice: "number (required)",
                brand: "string (optional)",
                stockQty: "number (optional, default: 0)",
                imageUrl: "string (optional)",
                // Excel fields (all optional)
                itemCode: "number",
                spNo: "number",
                uom: "string",
                defUom: "string",
                itemOnFlag: "boolean",
                rackNo: "string",
                opStock: "number",
                hsnCode: "number",
                gst: "number",
                stockItem: "string",
                itemDisc: "string",
                mrp: "number",
                purRate: "number",
                invoiceRate: "number",
                cashMemoRate: "number",
                estimateRate: "number",
                cashSalesRate: "number",
                agRate: "number",
                invDisc: "number",
                cashMemoDisc: "number",
                estimateDisc: "number",
                agDisc: "number"
              }
            ]
          }
        ]
      },
      example: {
        productsData: [
          {
            productName: "Safety Helmet",
            description: "Industrial safety helmet with chin strap",
            category: "Safety Gear",
            imageUrl: "https://example.com/helmet.jpg",
            variants: [
              {
                variantName: "Basic Helmet Red",
                variantPrice: 450,
                brand: "3M",
                stockQty: 100,
                itemCode: 1001,
                hsnCode: 6506,
                gst: 18
              },
              {
                variantName: "Premium Helmet Blue",
                variantPrice: 650,
                brand: "Honeywell",
                stockQty: 50,
                itemCode: 1002,
                hsnCode: 6506,
                gst: 18
              }
            ]
          }
        ]
      },
      notes: [
        "1. productName + category combination must be unique",
        "2. variantName + brand combination should be unique within a product",
        "3. itemCode is recommended for variant identification",
        "4. For updates, provide existing itemCode or variantName+brand"
      ]
    };

    res.status(200).json({
      success: true,
      data: template
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate template",
      error: error.message
    });
  }
};

// Helper function to calculate success rate
function calculateSuccessRate(results) {
  const totalOperations = 
    results.summary.products.created +
    results.summary.products.updated +
    results.summary.variants.created +
    results.summary.variants.updated;
  
  const totalAttempted = 
    results.totalRecordsProcessed * 2; // Rough estimate
  
  if (totalAttempted === 0) return 0;
  
  return Math.round((totalOperations / totalAttempted) * 100);
}


exports.importProductsFromExcel = async (req, res) => {
  try {
    // File is already validated by multer middleware
    // req.file contains the uploaded file buffer
    
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded or file is empty"
      });
    }

    // Process Excel from memory buffer
    const importResult = await processExcelFromBuffer(req.file.buffer);
    
    res.status(200).json({
      success: true,
      message: "Excel import completed successfully",
      data: importResult
    });
    
  } catch (error) {
    console.error("Excel import error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to import from Excel",
      error: error.message
    });
  }
};

async function processExcelFromBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const errors = [];
  const bulkOps = [];

  // Ensure Others category exists
  let generalCategory = await Category.findOne({ name: "Others" });
  if (!generalCategory) {
    generalCategory = await Category.create({ name: "Others" });
  }

  // Get last itemCode
  const lastVariant = await Variant.findOne().sort({ itemCode: -1 });
  let nextItemCode = lastVariant?.itemCode || 1000;

  for (const row of rows) {
    try {
      if (!row.productName || !row.variantName) {
        errors.push({ reason: "Missing productName or variantName", row });
        continue;
      }

      // CATEGORY
      let categoryName = row.categoryName?.trim() || "General";

      let category = await Category.findOne({ name: categoryName });
      if (!category) {
        category = await Category.create({ name: categoryName });
      }

      // PRODUCT
      let product = await Product.findOne({
        productName: row.productName,
        categoryId: category._id
      });

      if (!product) {
        product = await Product.create({
          productName: row.productName,
          description: row.prodDescription || "",
          imageUrl: row.productImageUrl || "",
          categoryId: category._id
        });
      }

      // ITEM CODE
      let itemCode = row.itemCode;
      if (!itemCode) {
        itemCode = nextItemCode++;
      }

      const imageUrl =
        row.variantImageUrl ||
        row.productImageUrl ||
        "";

      bulkOps.push({
        updateOne: {
          filter: { itemCode },
          update: {
            $set: {
              productId: product._id,
              variantName: row.variantName,
              variantDescription: row.variantDescription || "",
              brand: row.brand || "Others",
              invoicePrice: row.invoicePrice,
              estimatePrice: row.estimatePrice,
              stockQty: row.stockQty,
              imageUrl,
              gst: row.gst || 0,
              itemCode
            }
          },
          upsert: true
        }
      });

    } catch (err) {
      errors.push({
        product: row.productName,
        error: err.message
      });
    }
  }

  if (bulkOps.length > 0) {
    await Variant.bulkWrite(bulkOps);
  }

  return {
    totalRows: rows.length,
    processed: bulkOps.length,
    skipped: errors.length,
    errors: errors.slice(0, 20) // Limit error response size
  };
}
