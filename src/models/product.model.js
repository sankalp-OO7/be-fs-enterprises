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
      required: true 
    },
    imageUrl: { 
      type: String 
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { timestamps: true }
);

// Index for product name and category combination
productSchema.index({ productName: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model("Product", productSchema);