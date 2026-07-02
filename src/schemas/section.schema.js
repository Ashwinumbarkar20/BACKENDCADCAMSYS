import mongoose from "mongoose";
import { CTASectionSchema } from "./ctaSection.schema.js";
import { FAQSchema } from "./faq.schema.js";
import { MediaSchema } from "./media.schema.js";
import { MetricSchema } from "./metric.schema.js";
import { ButtonSchema } from "./button.schema.js";

const SectionItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    media: { type: MediaSchema },
    button: { type: ButtonSchema },
    metrics: { type: [MetricSchema], default: undefined },
  },
  { _id: false }
);

export const SectionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // frontend resolves by "type"
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    content: { type: String, default: "" },

    image: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    items: { type: [SectionItemSchema], default: undefined },
    faqs: { type: [FAQSchema], default: undefined },
    cta: { type: CTASectionSchema },

    config: { type: mongoose.Schema.Types.Mixed }, // per-section config for page builder
  },
  { _id: false }
);

