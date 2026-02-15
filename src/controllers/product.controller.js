const mongoose = require('mongoose');
const Product = require("../models/product.model");
const Variant = require("../models/variant.model");
const Category = require("../models/category.model");


// Get all products with optional pagination
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const skip = limit ? (page - 1) * limit : 0;

    // Build query for filtering
    const query = {};

    // Filter by category if provided
    if (req.query.categoryId) {
      query.categoryId = req.query.categoryId;
    }

    // Search by product name if provided
    if (req.query.search) {
      query.productName = { $regex: req.query.search, $options: "i" };
    }

    const productsQuery = Product.find(query)
      .populate("categoryId", "name")
      .select("-createdAt -updatedAt -__v")
      .sort({ productName: 1 });

    if (limit) {
      productsQuery.skip(skip).limit(limit);
    }

    const [products, total] = await Promise.all([
      productsQuery,
      Product.countDocuments(query),
    ]);

    const totalPages = limit ? Math.ceil(total / limit) : 1;

    res.status(200).json({
      success: true,
      pagination: limit
        ? {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          }
        : null,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single product by ID with variants
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";

    const product = await Product.findById(id).populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Get variants for this product
    const variants = await Variant.find({ productId: id });

    // Format variants based on user role
    const formattedVariants = variants.map((variant) => {
      const variantData = variant.toObject();

      // For non-admin users, hide actual price
      if (!isAdmin) {
        variantData.actualPrice = variantData.variantPrice;
        variantData.variantPrice = null;
      } else {
        // For admin, show actual price
        variantData.actualPrice = variantData.variantPrice;
      }

      return variantData;
    });

    res.status(200).json({
      success: true,
      data: {
        ...product.toObject(),
        variants: formattedVariants,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Get variants for a specific product
exports.getProductVariants = async (req, res) => {
  try {
    const { productId } = req.params;

    const isAuthenticated = !!req.user;
    const product = await Product.findById(productId).select(
      "productName categoryId description imageUrl"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const variants = await Variant.find({ productId }).select(
      "-createdAt -updatedAt -__v"
    );

    /* -----------------------------------------
       AUTHENTICATED USER → FULL DATA
    ------------------------------------------ */
    if (isAuthenticated) {
      const prices = variants
        .map((v) => v.actualPrice)
        .filter((p) => typeof p === "number");

      const minPrice = prices.length ? Math.min(...prices) : null;
      const maxPrice = prices.length ? Math.max(...prices) : null;

      const priceRange =
        minPrice && maxPrice
          ? minPrice === maxPrice
            ? `₹${minPrice.toFixed(2)}`
            : `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`
          : null;
      return res.status(200).json({
        success: true,
        product: {
          id: product._id,
          productName: product.productName,
          description: product.description,
          imageUrl: product.imageUrl,
          categoryName: product.categoryId?.name || null,
        categoryId: product.categoryId?._id || null,
        },
        priceRange,
        count: variants.length,
        data: variants, // FULL DATA
      });
    }

    /* -----------------------------------------
       GUEST USER → LIMITED SAFE DATA
    ------------------------------------------ */
    const formattedVariants = variants.map((variant) => {
      return {
        sku: variant.sku ?? null,
        id:variant._id,
        variantName: variant.variantName ?? null,
        variantAttributes: variant.variantAttributes ?? null,
        variantDescription: variant.variantDescription ?? null,
        invoicePrice: variant.invoicePrice ?? null,
        estimatePrice: variant.estimatePrice ?? null,
        brand: variant.brand ?? null,
        stockQty: variant.stockQty ?? null,
        itemCode: variant.itemCode ?? null,
      };
    });

    // 🔐 priceRange logic (BACKEND version of your useMemo)
    const prices = variants
      .map((v) => v.actualPrice)
      .filter((p) => typeof p === "number");

    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    const priceRange =
      minPrice && maxPrice
        ? minPrice === maxPrice
          ? `₹${minPrice.toFixed(2)}`
          : `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`
        : null;

    return res.status(200).json({
      success: true,
      product: {
        id: product._id,
        productName: product.productName,
        description: product.description,
        imageUrl: product.imageUrl,
        categoryName: product.categoryId?.name || null,
        categoryId: product.categoryId?._id || null,
      },
      priceRange, // ✅ allowed summary info
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

// Create new product (without variants)
exports.createProduct = async (req, res) => {
  try {
    const { productName, description, imageUrl, categoryId } = req.body;

    // Validation
    if (!productName || productName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if product with same name exists in same category
    const existingProduct = await Product.findOne({
      productName: productName.trim(),
      categoryId: categoryId,
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this name already exists in this category",
      });
    }

    const product = new Product({
      productName: productName.trim(),
      description: description || "",
      imageUrl: imageUrl || "",
      categoryId: categoryId,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating product",
      error: error.message,
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // If categoryId is being updated, verify it exists
    if (updateData.categoryId) {
      const category = await Category.findById(updateData.categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
    }

    // If productName is being updated, check for duplicates
    if (updateData.productName) {
      const existingProduct = await Product.findOne({
        productName: updateData.productName.trim(),
        description: updateData.description || (await Product.findById(id)).description,
        categoryId:
          updateData.categoryId || (await Product.findById(id)).categoryId,
        _id: { $ne: id },
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "Product with this name already exists in this category",
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("categoryId", "name");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message,
    });
  }
};

// Delete product (and its variants)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // First delete all variants of this product
    await Variant.deleteMany({ productId: id });

    // Then delete the product
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product and its variants deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting product",
      error: error.message,
    });
  }
};

// Filter products with advanced options
exports.filterProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      brand,
      inStock,
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (page - 1) * limit;

    // Build product query
    const productQuery = {};

    if (search) {
      productQuery.productName = { $regex: search, $options: "i" };
    }

    if (category) {
      // Find category by name
      const categoryDoc = await Category.findOne({
        name: { $regex: category, $options: "i" },
      });
      if (categoryDoc) {
        productQuery.categoryId = categoryDoc._id;
      }
    }

    // Get products first
    const products = await Product.find(productQuery)
      .populate("categoryId", "name")
      .skip(skip)
      .limit(parseInt(limit));

    // Build variant query
    const variantQuery = {};
    const variantConditions = [];

    if (minPrice || maxPrice) {
      const priceCondition = {};
      if (minPrice) priceCondition.$gte = parseFloat(minPrice);
      if (maxPrice) priceCondition.$lte = parseFloat(maxPrice);
      variantConditions.push({ variantPrice: priceCondition });
    }

    if (brand) {
      variantConditions.push({ brand: { $regex: brand, $options: "i" } });
    }

    if (inStock === "true") {
      variantConditions.push({ stockQty: { $gt: 0 } });
    }

    if (variantConditions.length > 0) {
      variantQuery.$and = variantConditions;
    }

    // Get product IDs for variant filtering
    const productIds = products.map((p) => p._id);
    if (productIds.length > 0) {
      variantQuery.productId = { $in: productIds };
    }

    // Get filtered variants
    const variants = await Variant.find(variantQuery);

    // Group variants by product
    const productMap = {};
    variants.forEach((variant) => {
      if (!productMap[variant.productId]) {
        productMap[variant.productId] = [];
      }
      productMap[variant.productId].push(variant);
    });

    // Combine products with their variants
    const result = products
      .filter((product) => productMap[product._id]?.length > 0)
      .map((product) => ({
        ...product.toObject(),
        variants: productMap[product._id],
      }));

    const total = await Product.countDocuments(productQuery);

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      count: result.length,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Filter error",
      error: error.message,
    });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [products, total] = await Promise.all([
      Product.find({ categoryId })
        .populate("categoryId", "name")
        .skip(skip)
        .limit(limit)
        .sort({ productName: 1 }),
      Product.countDocuments({ categoryId }),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      category: {
        id: category._id,
        name: category.name,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};


// In your product controller (product.controller.js)

/**
 * @desc    Bulk update product and its variants
 * @route   PUT /api/products/:id/bulk-update
 * @access  Private/Admin
 */
exports.bulkUpdateProductWithVariants = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      product: productUpdates, 
      variants: variantUpdates = [], 
      variantsToDelete = []  // Add this parameter for deletions
    } = req.body;

    // 1. Validate product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Process product updates
    if (productUpdates && Object.keys(productUpdates).length > 0) {
      // ... (existing product update code remains the same)
    }

    // 3. Handle variant deletions FIRST
    if (variantsToDelete && variantsToDelete.length > 0) {
      // Validate all variants to delete belong to this product
      const variantsToRemove = await Variant.find({
        _id: { $in: variantsToDelete },
        productId: id
      });
      
      if (variantsToRemove.length !== variantsToDelete.length) {
        return res.status(404).json({
          success: false,
          message: "Some variants to delete were not found or don't belong to this product",
        });
      }
      
      // Delete the variants
      await Variant.deleteMany({
        _id: { $in: variantsToDelete }
      });
    }

    // 4. Separate new variants from existing variants
    const newVariants = [];
    const existingVariantUpdates = [];
    
    for (const variant of variantUpdates) {
      // Check if variant has _id and if it's a valid ObjectId
      if (variant._id && mongoose.Types.ObjectId.isValid(variant._id)) {
        // Valid ObjectId - existing variant
        existingVariantUpdates.push(variant);
      } else {
        // No _id or invalid ObjectId - new variant
        const { _id, isNew, hasCustomImage, id: tempId, ...variantData } = variant;
        newVariants.push(variantData);
      }
    }

    // 5. Handle new variants
    if (newVariants.length > 0) {
      const variantsToCreate = newVariants.map(variant => ({
        ...variant,
        productId: id,
        imageUrl: variant.imageUrl || (productUpdates?.imageUrl || existingProduct.imageUrl),
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await Variant.insertMany(variantsToCreate);
    }

    // 6. Handle existing variants
    if (existingVariantUpdates.length > 0) {
      const updatePromises = [];
      
      for (const variant of existingVariantUpdates) {
        const { _id, ...updateData } = variant;
        
        // Validate variant exists and belongs to this product
        const existingVariant = await Variant.findOne({ _id, productId: id });
        if (!existingVariant) {
          continue; // Skip if variant doesn't exist (might have been deleted)
        }

        // Check for duplicate variant names
        if (updateData.variantName) {
          const duplicateVariant = await Variant.findOne({
            variantName: updateData.variantName.trim(),
            productId: id,
            _id: { $ne: _id }
          });

          if (duplicateVariant) {
            return res.status(409).json({
              success: false,
              message: `Variant name "${updateData.variantName}" already exists for this product`,
            });
          }
        }

        // Auto-update actualPrice when variantPrice changes
        if (updateData.variantPrice !== undefined) {
          updateData.actualPrice = updateData.variantPrice;
        }

        // Handle image inheritance
        if (!updateData.hasCustomImage && productUpdates?.imageUrl) {
          updateData.imageUrl = productUpdates.imageUrl;
        }

        updatePromises.push(
          Variant.findByIdAndUpdate(
            _id,
            { $set: updateData },
            { new: true, runValidators: true }
          )
        );
      }

      await Promise.all(updatePromises);
    }

    // 7. Fetch updated data
    const updatedProduct = await Product.findById(id)
      .populate("categoryId", "name")
      .lean();
    
    const updatedVariants = await Variant.find({ productId: id });

    res.status(200).json({
      success: true,
      message: `Bulk update successful - Deleted: ${variantsToDelete?.length || 0}, Created: ${newVariants.length}, Updated: ${existingVariantUpdates.length}`,
      data: {
        product: updatedProduct,
        variants: updatedVariants,
        stats: {
          deleted: variantsToDelete?.length || 0,
          created: newVariants.length,
          updated: existingVariantUpdates.length,
          total: updatedVariants.length
        }
      },
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate key error",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error in bulk update",
      error: error.message,
    });
  }
};