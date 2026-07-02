import mongoose from "mongoose";

export const MetricSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
    helperText: { type: String, default: "" },
  },
  { _id: false }
);

