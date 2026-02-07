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
    console.log("isAuthenticated:", isAuthenticated, req.user);
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
       console.log("Product balu:", product);
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
        variantName: variant.variantName ?? null,
        variantAttributes: variant.variantAttributes ?? null,
        brand: variant.brand ?? null,
        description: variant.description ?? null,
        actualPrice: null, // 🔐 explicitly null
        stockQty: variant.stockQty ?? null,
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
        console.log("Product balu:", product);

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
    console.log("Update data:", updateData);
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
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const { id } = req.params;
    const { product: productUpdates, variants: variantUpdates = [] } = req.body;

    // 1. Validate product exists
    const existingProduct = await Product.findById(id).session(session);
    if (!existingProduct) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // 2. Process product updates
    let updatedProduct = existingProduct;
    
    if (productUpdates && Object.keys(productUpdates).length > 0) {
      // If categoryId is being updated, verify it exists
      if (productUpdates.categoryId) {
        const category = await Category.findById(productUpdates.categoryId).session(session);
        if (!category) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: "Category not found",
          });
        }
      }

      // If productName is being updated, check for duplicates
      if (productUpdates.productName) {
        const existingProductWithSameName = await Product.findOne({
          productName: productUpdates.productName.trim(),
          categoryId: productUpdates.categoryId || existingProduct.categoryId,
          _id: { $ne: id },
        }).session(session);

        if (existingProductWithSameName) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: "Product with this name already exists in this category",
          });
        }
      }

      // Apply product updates
      Object.assign(existingProduct, productUpdates);
      updatedProduct = await existingProduct.save({ session, new: true, runValidators: true });
    }

    // 3. Process variant updates (bulk operation)
    let updatedVariants = [];
    
    if (variantUpdates.length > 0) {
      // Prepare bulk operations
      const bulkOps = [];
      const variantNamesMap = new Map(); // For duplicate name checking
      const variantIds = variantUpdates.map(v => v._id).filter(Boolean);

      // Get existing variants for this product
      const existingVariants = await Variant.find({ 
        productId: id,
        _id: { $in: variantIds }
      }).session(session);

      // Create a map for quick lookup
      const existingVariantsMap = new Map(
        existingVariants.map(v => [v._id.toString(), v])
      );

      // Process each variant update
      for (const variantUpdate of variantUpdates) {
        const { _id, ...updateData } = variantUpdate;

        // Validate variant exists (if it has an _id)
        if (_id && !existingVariantsMap.has(_id)) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Variant with ID ${_id} not found`,
          });
        }

        // Handle variant name uniqueness check
        if (updateData.variantName) {
          const trimmedName = updateData.variantName.trim();
          
          // Check for duplicates within the same update batch
          if (variantNamesMap.has(trimmedName) && variantNamesMap.get(trimmedName) !== _id) {
            await session.abortTransaction();
            return res.status(409).json({
              success: false,
              message: `Duplicate variant name found: "${trimmedName}"`,
            });
          }
          variantNamesMap.set(trimmedName, _id);

          // Check for duplicates in database (excluding this variant)
          const existingVariantWithSameName = await Variant.findOne({
            variantName: trimmedName,
            productId: id,
            _id: { $ne: _id }
          }).session(session);

          if (existingVariantWithSameName) {
            await session.abortTransaction();
            return res.status(409).json({
              success: false,
              message: `Variant with name "${trimmedName}" already exists for this product`,
            });
          }
        }

        // Auto-update actualPrice when variantPrice changes
        if (updateData.variantPrice !== undefined) {
          updateData.actualPrice = updateData.variantPrice;
        }

        // Handle image inheritance - if variant doesn't have custom image, use product image
        if (!updateData.hasCustomImage && productUpdates?.imageUrl) {
          updateData.imageUrl = productUpdates.imageUrl;
        }

        // Prepare bulk operation
        if (_id) {
          // Update existing variant
          bulkOps.push({
            updateOne: {
              filter: { _id: mongoose.Types.ObjectId(_id), productId: id },
              update: { $set: updateData },
              upsert: false,
            }
          });
        } else {
          // Create new variant (if needed)
          bulkOps.push({
            insertOne: {
              document: {
                ...updateData,
                productId: id,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            }
          });
        }
      }

      // Execute bulk operations if there are any
      if (bulkOps.length > 0) {
        const bulkResult = await Variant.bulkWrite(bulkOps, { session });
        
        // Get updated variants data
        updatedVariants = await Variant.find({ 
          productId: id 
        }).session(session);
      } else {
        updatedVariants = existingVariants;
      }
    }

    // 4. Commit transaction
    await session.commitTransaction();
    
    // 5. Populate and return response
    const populatedProduct = await Product.findById(id)
      .populate("categoryId", "name")
      .lean();

    res.status(200).json({
      success: true,
      message: `Product and ${variantUpdates.length} variants updated successfully`,
      data: {
        product: populatedProduct,
        variants: updatedVariants,
        stats: {
          productUpdated: !!productUpdates,
          variantsUpdated: variantUpdates.length,
          variantsTotal: updatedVariants.length
        }
      },
    });

  } catch (error) {
    // Rollback on error
    await session.abortTransaction();
    
    console.error('Bulk update error:', error);
    
    // Handle specific errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: error.message,
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
  } finally {
    session.endSession();
  }
};