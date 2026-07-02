import mongoose from "mongoose";
import { SeoSchema } from "../schemas/seo.schema.js";
import { FAQSchema } from "../schemas/faq.schema.js";
import { publishablePlugin } from "./plugins/publishable.js";

const KeyFeatureSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
  },
  { _id: false }
);

const SupportingMachineSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Media" }],
  },
  { _id: false }
);

const UseCaseSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const FAQSectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    items: { type: [FAQSchema], default: [] },
  },
  { _id: false }
);

const VideoItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false }
);

const PdfItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    file: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
  },
  { _id: false }
);

const MediaSectionSchema = new mongoose.Schema(
  {
    videos: { type: [VideoItemSchema], default: [] },
    pdfs: { type: [PdfItemSchema], default: [] },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "ProductCategory", index: true },
    solution: { type: mongoose.Schema.Types.ObjectId, ref: "Solution", index: true },

    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },

    tagline: { type: String, default: "" },
    overview: { type: String, default: "" },

    keyFeatures: { type: [KeyFeatureSchema], default: [] },
    benefits: [{ type: String }],

    supportingMachine: { type: SupportingMachineSchema, default: () => ({}) },

    useCases: { type: [UseCaseSchema], default: [] },

    // Solutions are the parent container of this Product (see `solution`
    // above) — cross-content links go through Products, not Solutions.
    relatedIndustries: [{ type: mongoose.Schema.Types.ObjectId, ref: "Industry", index: true }],
    relatedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog", index: true }],
    relatedTestimonials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Testimonial", index: true }],
    relatedCaseStudies: [{ type: mongoose.Schema.Types.ObjectId, ref: "CaseStudy", index: true }],

    faqSections: { type: [FAQSectionSchema], default: [] },

    mediaSection: { type: MediaSectionSchema, default: () => ({}) },

    seo: { type: SeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

ProductSchema.plugin(publishablePlugin);
ProductSchema.index({ status: 1, publishedAt: -1 });

ProductSchema.post("save", async function syncProductSolution() {
  const Solution = mongoose.model("Solution");
  const productId = this._id;
  if (this.solution) {
    await Solution.findByIdAndUpdate(this.solution, { $addToSet: { products: productId } });
    await Solution.updateMany(
      { products: productId, _id: { $ne: this.solution } },
      { $pull: { products: productId } },
    );
  } else {
    await Solution.updateMany({ products: productId }, { $pull: { products: productId } });
  }
});

export const Product = mongoose.model("Product", ProductSchema);
