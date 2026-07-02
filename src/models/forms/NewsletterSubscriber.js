import mongoose from "mongoose";

const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sourcePage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const NewsletterSubscriber = mongoose.model("NewsletterSubscriber", NewsletterSubscriberSchema);

