const Product = require("../models/product.model");
const NodeCache = require("node-cache");

// ✅ Lightweight cache (30s TTL)
const cache = new NodeCache({ stdTTL: 30 });

// ✅ Helper for consistent responses
const send = (res, status, data) => res.status(status).json(data);

// ✅ Get all products (fast + paginated + cached)
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, fields } = req.query;
    const skip = (page - 1) * limit;
    const projection = fields
      ? fields.split(",").join(" ")
      : "name description categoryId variants.name variants.price";

    const cacheKey = `products-${page}-${limit}-${fields || "default"}`;

    // ✅ Check cache first
    const cached = cache.get(cacheKey);
    if (cached) return send(res, 200, cached);

    // ✅ Use lean() to return plain JS objects (faster)
    const products = await Product.find({}, projection)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()
      .exec();

    // ✅ Cache the result
    cache.set(cacheKey, products);

    send(res, 200, products);
  } catch (err) {
    send(res, 500, { message: err.message });
  }
};

// ✅ Get product by ID (cached)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product-${id}`;

    const cached = cache.get(cacheKey);
    if (cached) return send(res, 200, cached);

    const product = await Product.findById(id).lean().exec();
    if (!product) return send(res, 404, { message: "Product not found" });

    cache.set(cacheKey, product);
    send(res, 200, product);
  } catch (err) {
    send(res, 500, { message: err.message });
  }
};

// ✅ Create product
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();

    cache.flushAll(); // clear old cache
    send(res, 201, product);
  } catch (err) {
    send(res, 400, { message: err.message });
  }
};

// ✅ Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    })
      .lean()
      .exec();

    if (!product) return send(res, 404, { message: "Product not found" });

    cache.flushAll();
    send(res, 200, product);
  } catch (err) {
    send(res, 400, { message: err.message });
  }
};

// ✅ Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id).lean().exec();

    if (!product) return send(res, 404, { message: "Product not found" });

    cache.flushAll();
    send(res, 200, { message: "Product deleted successfully" });
  } catch (err) {
    send(res, 500, { message: err.message });
  }
};
