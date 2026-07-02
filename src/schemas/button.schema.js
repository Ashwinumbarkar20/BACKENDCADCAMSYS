import mongoose from "mongoose";

export const ButtonSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    variant: { type: String, default: "primary" },
    target: { type: String, enum: ["_self", "_blank"], default: "_self" },
  },
  { _id: false }
);

