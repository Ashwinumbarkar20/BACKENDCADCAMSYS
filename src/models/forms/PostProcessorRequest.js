import mongoose from "mongoose";

// "Develop a post-processor for my machine" requests from the post-processor
// development page. The sample NC file is uploaded and stored as a URL.
const PostProcessorRequestSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, default: "", trim: true },
    mobile: { type: String, default: "", trim: true },
    machineBrand: { type: String, required: true, trim: true },
    controller: { type: String, default: "", trim: true },
    technology: { type: String, default: "", trim: true }, // plasma, laser, punch…
    notes: { type: String, default: "" },
    // Multiple uploaded sample programs.
    sampleFiles: {
      type: [new mongoose.Schema({ url: String, name: String }, { _id: false })],
      default: [],
    },
    // Legacy single-file fields, kept so existing records still render.
    sampleFileUrl: { type: String, default: "" },
    sampleFileName: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
    visitor: { type: mongoose.Schema.Types.ObjectId, ref: "Visitor", index: true },
  },
  { timestamps: true },
);

PostProcessorRequestSchema.index({ createdAt: -1 });

export const PostProcessorRequest = mongoose.model(
  "PostProcessorRequest",
  PostProcessorRequestSchema,
);
