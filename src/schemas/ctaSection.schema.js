import mongoose from "mongoose";
import { ButtonSchema } from "./button.schema.js";

export const CTASectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    primaryButton: { type: ButtonSchema },
    secondaryButton: { type: ButtonSchema },
  },
  { _id: false }
);

