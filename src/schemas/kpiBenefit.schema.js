import mongoose from "mongoose";

export const KpiBenefitSchema = new mongoose.Schema(
  {
    direction: { type: String, enum: ["up", "down"], required: true },
    metric: { type: String, required: true },
    value: { type: String, default: "" },
    helperText: { type: String, default: "" },
  },
  { _id: false }
);
