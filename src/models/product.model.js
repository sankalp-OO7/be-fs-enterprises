const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    description: { 
      type: String, 
      required: false, 
    },
    imageUrl: { 
      type: String,
      required: false, 
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for product name and category combination
productSchema.index({ productName: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);