const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    variantName: { 
      type: String, 
      required: true, 
      trim: true 
    },
    brand: { 
      type: String, 
      required: true, 
      trim: true 
    },
    variantPrice: { 
      type: Number, 
      required: true 
    },
    actualPrice: { 
      type: Number, 
      required: true 
    },
    stockQty: { 
      type: Number, 
      required: true, 
      default: 0 
    },
    imageUrl: { 
      type: String, 
      required: true 
    },

    // Excel-based fields (keeping original names)
    itemCode: { 
      type: Number 
    },
    spNo: { 
      type: Number 
    },
    uom: { 
      type: String, 
      trim: true 
    },
    defUom: { 
      type: String, 
      trim: true 
    },
    itemOnFlag: { 
      type: Boolean, 
      default: false 
    },
    rackNo: { 
      type: String, 
      trim: true 
    },
    opStock: { 
      type: Number, 
      default: 0 
    },
    hsnCode: { 
      type: Number 
    },
    gst: { 
      type: Number 
    },
    stockItem: { 
      type: String, 
      trim: true 
    },
    itemDisc: { 
      type: String, 
      trim: true 
    },
    mrp: { 
      type: Number, 
      default: 0 
    },
    purRate: { 
      type: Number, 
      default: 0 
    },
    invoiceRate: { 
      type: Number, 
      default: 0 
    },
    cashMemoRate: { 
      type: Number, 
      default: 0 
    },
    estimateRate: { 
      type: Number, 
      default: 0 
    },
    cashSalesRate: { 
      type: Number, 
      default: 0 
    },
    agRate: { 
      type: Number, 
      default: 0 
    },
    invDisc: { 
      type: Number, 
      default: 0 
    },
    cashMemoDisc: { 
      type: Number, 
      default: 0 
    },
    estimateDisc: { 
      type: Number, 
      default: 0 
    },
    agDisc: { 
      type: Number, 
      default: 0 
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
variantSchema.index({ productId: 1, variantName: 1 });
variantSchema.index({ itemCode: 1 }); // For quick lookup by itemCode

module.exports = mongoose.model("Variant", variantSchema);