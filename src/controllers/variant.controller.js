const Variant = require("../models/variant.model");
const Product = require("../models/product.model");

// Get all variants with optional filtering
exports.getAllVariants = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const { 
      productId, 
      brand, 
      minPrice, 
      maxPrice,
      inStock,
      page = 1,
      limit = 50
    } = req.query;

    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (productId) {
      query.productId = productId;
    }

    if (brand) {
      query.brand = { $regex: brand, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.variantPrice = {};
      if (minPrice) query.variantPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.variantPrice.$lte = parseFloat(maxPrice);
    }

    if (inStock === 'true') {
      query.stockQty = { $gt: 0 };
    } else if (inStock === 'false') {
      query.stockQty = { $lte: 0 };
    }

    const [variants, total] = await Promise.all([
      Variant.find(query)
        .populate({
          path: "productId",
          select: "productName categoryId",
          populate: {
            path: "categoryId",
            select: "name"
          }
        })
        .select("-createdAt -updatedAt -__v")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ variantName: 1 }),
      Variant.countDocuments(query)
    ]);

    // Format variants based on user role
    const formattedVariants = variants.map((variant) => {
      const variantData = variant.toObject();
      
      if (!isAdmin) {
        variantData.actualPrice = variantData.variantPrice;
        variantData.variantPrice = null;
      } else {
        variantData.actualPrice = variantData.variantPrice;
      }

      return variantData;
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      count: formattedVariants.length,
      data: formattedVariants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single variant by ID
exports.getVariantById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";

    const variant = await Variant.findById(id)
      .populate({
        path: "productId",
        select: "productName description categoryId",
        populate: {
          path: "categoryId",
          select: "name"
        }
      });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    const variantData = variant.toObject();
    
    // Format price based on user role
    if (!isAdmin) {
      variantData.actualPrice = variantData.variantPrice;
      variantData.variantPrice = null;
    } else {
      variantData.actualPrice = variantData.variantPrice;
    }

    res.status(200).json({
      success: true,
      data: variantData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Create variant for a specific product
exports.createVariant = async (req, res) => {
  try {
    const { productId } = req.params;
    const variantData = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate required fields
    if (!variantData.variantName || variantData.variantName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Variant name is required"
      });
    }

    if (!variantData.variantPrice || isNaN(variantData.variantPrice)) {
      return res.status(400).json({
        success: false,
        message: "Valid variant price is required"
      });
    }

    // Check if variant with same name already exists for this product
    const existingVariant = await Variant.findOne({
      productId: productId,
      variantName: variantData.variantName.trim()
    });

    if (existingVariant) {
      return res.status(409).json({
        success: false,
        message: "Variant with this name already exists for this product"
      });
    }

    // Create variant
    const variant = new Variant({
      ...variantData,
      productId,
      variantPrice: parseFloat(variantData.variantPrice),
      actualPrice: parseFloat(variantData.variantPrice)
    });

    await variant.save();

    // Populate product info in response
    const populatedVariant = await Variant.findById(variant._id)
      .populate({
        path: "productId",
        select: "productName"
      });

    res.status(201).json({
      success: true,
      message: "Variant created successfully",
      data: populatedVariant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating variant",
      error: error.message,
    });
  }
};

// Update variant
exports.updateVariant = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If price is being updated, also update actualPrice
    if (updateData.variantPrice !== undefined) {
      updateData.actualPrice = updateData.variantPrice;
    }

    // If variantName is being updated, check for duplicates
    if (updateData.variantName) {
      const existingVariant = await Variant.findOne({
        _id: { $ne: id },
        variantName: updateData.variantName.trim(),
        productId: (await Variant.findById(id)).productId
      });

      if (existingVariant) {
        return res.status(409).json({
          success: false,
          message: "Variant with this name already exists for this product"
        });
      }
    }

    const variant = await Variant.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate({
      path: "productId",
      select: "productName"
    });

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Variant updated successfully",
      data: variant,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating variant",
      error: error.message,
    });
  }
};

// Delete variant
exports.deleteVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const variant = await Variant.findByIdAndDelete(id);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Variant not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Variant deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting variant",
      error: error.message,
    });
  }
};

// Bulk create variants for a product
exports.bulkCreateVariants = async (req, res) => {
  try {
    const { productId } = req.params;
    const { variants } = req.body;

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Variants array is required with at least one variant"
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    const variantsToCreate = [];

    for (const variantData of variants) {
      try {
        // Validate variant data
        if (!variantData.variantName || !variantData.variantPrice) {
          results.errors.push({
            variant: variantData.variantName || 'Unknown',
            error: "Missing required fields (variantName, variantPrice)"
          });
          continue;
        }

        // Check if variant exists (by itemCode or name)
        let existingVariant;
        if (variantData.itemCode) {
          existingVariant = await Variant.findOne({
            productId: productId,
            itemCode: variantData.itemCode
          });
        }

        if (!existingVariant) {
          existingVariant = await Variant.findOne({
            productId: productId,
            variantName: variantData.variantName.trim()
          });
        }

        if (existingVariant) {
          // Update existing variant
          existingVariant.variantPrice = variantData.variantPrice;
          existingVariant.actualPrice = variantData.variantPrice;
          existingVariant.brand = variantData.brand || existingVariant.brand;
          existingVariant.stockQty = variantData.stockQty || existingVariant.stockQty;
          
          // Update other fields
          Object.keys(variantData).forEach(key => {
            if (key !== 'productId' && variantData[key] !== undefined) {
              existingVariant[key] = variantData[key];
            }
          });

          await existingVariant.save();
          results.updated++;
        } else {
          // Create new variant
          variantsToCreate.push({
            ...variantData,
            productId: productId,
            variantPrice: parseFloat(variantData.variantPrice),
            actualPrice: parseFloat(variantData.variantPrice)
          });
        }
      } catch (error) {
        results.errors.push({
          variant: variantData.variantName || 'Unknown',
          error: error.message
        });
      }
    }

    // Bulk insert new variants
    if (variantsToCreate.length > 0) {
      await Variant.insertMany(variantsToCreate);
      results.created += variantsToCreate.length;
    }

    res.status(201).json({
      success: true,
      message: "Bulk variant operation completed",
      results: results,
      product: {
        id: product._id,
        name: product.productName
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in bulk variant operation",
      error: error.message,
    });
  }
};

// Filter variants with advanced options
exports.filterVariants = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";
    const {
      productName,
      category,
      brand,
      minPrice,
      maxPrice,
      inStock,
      search,
      page = 1,
      limit = 30
    } = req.query;

    const skip = (page - 1) * limit;

    // Start building the aggregation pipeline
    const pipeline = [];

    // Lookup product details
    pipeline.push({
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product"
      }
    });

    pipeline.push({ $unwind: "$product" });

    // Lookup category details
    pipeline.push({
      $lookup: {
        from: "categories",
        localField: "product.categoryId",
        foreignField: "_id",
        as: "category"
      }
    });

    pipeline.push({ $unwind: "$category" });

    // Build match conditions
    const matchConditions = [];

    if (search) {
      matchConditions.push({
        $or: [
          { variantName: { $regex: search, $options: "i" } },
          { "product.productName": { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } }
        ]
      });
    }

    if (productName) {
      matchConditions.push({
        "product.productName": { $regex: productName, $options: "i" }
      });
    }

    if (category) {
      matchConditions.push({
        "category.name": { $regex: category, $options: "i" }
      });
    }

    if (brand) {
      matchConditions.push({
        brand: { $regex: brand, $options: "i" }
      });
    }

    if (minPrice || maxPrice) {
      const priceCondition = {};
      if (minPrice) priceCondition.$gte = parseFloat(minPrice);
      if (maxPrice) priceCondition.$lte = parseFloat(maxPrice);
      matchConditions.push({ variantPrice: priceCondition });
    }

    if (inStock === 'true') {
      matchConditions.push({ stockQty: { $gt: 0 } });
    } else if (inStock === 'false') {
      matchConditions.push({ stockQty: { $lte: 0 } });
    }

    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    // Add count and pagination
    const facetStage = {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $project: {
              _id: 1,
              variantName: 1,
              variantPrice: 1,
              actualPrice: 1,
              brand: 1,
              stockQty: 1,
              imageUrl: 1,
              itemCode: 1,
              product: {
                _id: "$product._id",
                productName: "$product.productName"
              },
              category: {
                _id: "$category._id",
                name: "$category.name"
              }
            }
          }
        ]
      }
    };

    pipeline.push(facetStage);

    const result = await Variant.aggregate(pipeline);

    const variants = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    // Format variants based on user role
    const formattedVariants = variants.map((variant) => {
      const variantData = { ...variant };
      
      if (!isAdmin) {
        variantData.actualPrice = variantData.variantPrice;
        variantData.variantPrice = null;
      } else {
        variantData.actualPrice = variantData.variantPrice;
      }

      return variantData;
    });

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      count: formattedVariants.length,
      data: formattedVariants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Filter error",
      error: error.message
    });
  }
};