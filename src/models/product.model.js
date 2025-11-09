const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    stockQty: { type: Number, required: true, default: 0 },
    imageUrl: { type: String, required: true },

    // 🆕 Excel-based fields
    itemCode: { type: Number }, // ItemCode
    spNo: { type: Number }, // SPNO
    uom: { type: String, trim: true }, // UOM
    defUom: { type: String, trim: true }, // DefUom
    itemOnFlag: { type: Boolean, default: false }, // ItemonFlag
    rackNo: { type: String, trim: true },
    opStock: { type: Number, default: 0 },
    hsnCode: { type: Number },
    gst: { type: Number },
    stockItem: { type: String, trim: true },
    itemDisc: { type: String, trim: true },
    mrp: { type: Number, default: 0 },
    purRate: { type: Number, default: 0 },
    invoiceRate: { type: Number, default: 0 },
    cashMemoRate: { type: Number, default: 0 },
    estimateRate: { type: Number, default: 0 },
    cashSalesRate: { type: Number, default: 0 },
    agRate: { type: Number, default: 0 },
    invDisc: { type: Number, default: 0 },
    cashMemoDisc: { type: Number, default: 0 },
    estimateDisc: { type: Number, default: 0 },
    agDisc: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    variants: [variantSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
