const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: false,
    },
     createdAt: { type: Date, default: Date.now },
     updatedAt: { type: Date, default: Date.now },
  },
 
  { timestamps: true }
);
module.exports = mongoose.model("Category", categorySchema);
