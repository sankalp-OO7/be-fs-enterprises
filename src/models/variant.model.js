const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    variantName: {
      type: String,
      required: true,
      trim: true,
    },
    variantDescription: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      required: false,
      default: "Others",
      trim: true,
    },
    invoicePrice: {
      type: Number,
      required: true,
    },
    estimatePrice: {
      type: Number,
      required: true,
    },
    stockQty: {
      type: Number,
      required: true,
      default: 0,
    },
    gst:{
      type: Number,
      required: false,
      default: 0,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    itemCode: {
      type: Number,
      unique: true,
      sparse: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Indexes for better query performance
variantSchema.index({ productId: 1, variantName: 1 });


module.exports = mongoose.model("Variant", variantSchema);
