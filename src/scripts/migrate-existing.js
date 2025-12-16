const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product.model');
const Variant = require('../models/variant.model');

async function migrateExistingData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all products with the old schema (if any)
    const oldProducts = await mongoose.connection.db.collection('products').find({
      $or: [
        { name: { $exists: true } },
        { variants: { $exists: true, $ne: [] } }
      ]
    }).toArray();

    console.log(`Found ${oldProducts.length} products with old schema`);

    for (const oldProduct of oldProducts) {
      // Create new product document
      const newProduct = new Product({
        productName: oldProduct.name || oldProduct.productName || 'Unnamed Product',
        description: oldProduct.description || '',
        imageUrl: oldProduct.imageUrl || '',
        categoryId: oldProduct.categoryId,
        createdAt: oldProduct.createdAt,
        updatedAt: oldProduct.updatedAt
      });

      await newProduct.save();
      console.log(`✅ Migrated product: ${newProduct.productName}`);

      // Migrate variants if they exist
      if (oldProduct.variants && Array.isArray(oldProduct.variants)) {
        const variantsToCreate = oldProduct.variants.map(oldVariant => ({
          productId: newProduct._id,
          variantName: oldVariant.name || oldVariant.variantName || 'Unnamed Variant',
          brand: oldVariant.brand || '',
          variantPrice: oldVariant.price || oldVariant.variantPrice || 0,
          actualPrice: oldVariant.price || oldVariant.variantPrice || 0,
          stockQty: oldVariant.stockQty || 0,
          imageUrl: oldVariant.imageUrl || newProduct.imageUrl,
          // Map all Excel fields
          itemCode: oldVariant.itemCode,
          spNo: oldVariant.spNo,
          uom: oldVariant.uom,
          defUom: oldVariant.defUom,
          itemOnFlag: oldVariant.itemOnFlag || false,
          rackNo: oldVariant.rackNo,
          opStock: oldVariant.opStock || 0,
          hsnCode: oldVariant.hsnCode,
          gst: oldVariant.gst || 0,
          stockItem: oldVariant.stockItem,
          itemDisc: oldVariant.itemDisc,
          mrp: oldVariant.mrp,
          purRate: oldVariant.purRate,
          invoiceRate: oldVariant.invoiceRate,
          cashMemoRate: oldVariant.cashMemoRate,
          estimateRate: oldVariant.estimateRate,
          cashSalesRate: oldVariant.cashSalesRate,
          agRate: oldVariant.agRate,
          invDisc: oldVariant.invDisc || 0,
          cashMemoDisc: oldVariant.cashMemoDisc || 0,
          estimateDisc: oldVariant.estimateDisc || 0,
          agDisc: oldVariant.agDisc || 0,
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        }));

        await Variant.insertMany(variantsToCreate);
        console.log(`   ↳ Migrated ${variantsToCreate.length} variants`);
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateExistingData();