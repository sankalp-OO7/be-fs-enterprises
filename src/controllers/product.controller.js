const Product = require("../models/product.model");
const Variant = require("../models/variant.model");
const Category = require("../models/category.model");

// Get all products with optional pagination
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

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

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("categoryId", "name")
        .select("-createdAt -updatedAt -__v")
        .skip(skip)
        .limit(limit)
        .sort({ productName: 1 }),
      Product.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
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

// Get single product by ID with variants
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === "admin";

    const product = await Product.findById(id)
      .populate("categoryId", "name");

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
    const isAdmin = req.user?.role === "admin";

    // Check if product exists
    const product = await Product.findById(productId)
      .select("productName categoryId");
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Get variants
    const variants = await Variant.find({ productId: productId })
      .select("-createdAt -updatedAt -__v");

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

    res.status(200).json({
      success: true,
      product: {
        id: product._id,
        productName: product.productName,
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

// Create new product (without variants)
exports.createProduct = async (req, res) => {
  try {
    const { productName, description, imageUrl, categoryId } = req.body;

    // Validation
    if (!productName || productName.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product name is required"
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
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
      categoryId: categoryId
    });

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: "Product with this name already exists in this category"
      });
    }

    const product = new Product({
      productName: productName.trim(),
      description: description || "",
      imageUrl: imageUrl || "",
      categoryId: categoryId
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
        categoryId: updateData.categoryId || (await Product.findById(id)).categoryId,
        _id: { $ne: id }
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: "Product with this name already exists in this category"
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
      limit = 20
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
        name: { $regex: category, $options: "i" } 
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

    if (inStock === 'true') {
      variantConditions.push({ stockQty: { $gt: 0 } });
    }

    if (variantConditions.length > 0) {
      variantQuery.$and = variantConditions;
    }

    // Get product IDs for variant filtering
    const productIds = products.map(p => p._id);
    if (productIds.length > 0) {
      variantQuery.productId = { $in: productIds };
    }

    // Get filtered variants
    const variants = await Variant.find(variantQuery);

    // Group variants by product
    const productMap = {};
    variants.forEach(variant => {
      if (!productMap[variant.productId]) {
        productMap[variant.productId] = [];
      }
      productMap[variant.productId].push(variant);
    });

    // Combine products with their variants
    const result = products
      .filter(product => productMap[product._id]?.length > 0)
      .map(product => ({
        ...product.toObject(),
        variants: productMap[product._id]
      }));

    const total = await Product.countDocuments(productQuery);

    res.status(200).json({
      success: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      },
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Filter error",
      error: error.message
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
        message: "Category not found"
      });
    }

    const [products, total] = await Promise.all([
      Product.find({ categoryId })
        .populate("categoryId", "name")
        .skip(skip)
        .limit(limit)
        .sort({ productName: 1 }),
      Product.countDocuments({ categoryId })
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      category: {
        id: category._id,
        name: category.name
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};