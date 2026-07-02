import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const TestimonialSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    company: { type: String, default: "" },
    designation: { type: String, default: "" },
    quote: { type: String, required: true },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    logo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    rating: { type: Number, default: 5, min: 1, max: 5 },

    industry: { type: mongoose.Schema.Types.ObjectId, ref: "Industry", index: true },
    // Testimonials link to specific Products only. Solutions are derived from
    // each product's `solution` parent at display time.
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

TestimonialSchema.plugin(publishablePlugin);
TestimonialSchema.index({ status: 1, publishedAt: -1 });

export const Testimonial = mongoose.model("Testimonial", TestimonialSchema);

