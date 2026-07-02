import mongoose from "mongoose";

// Each lead-form submission tied to this visitor cookie.
const LinkedLeadSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: [
        "contact",
        "consultation",
        "support",
        "newsletter",
        "roi",
        "job-application",
      ],
      required: true,
    },
    submissionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Aggregated record per anonymous visitor (keyed by browser cookie).
// IPs are hashed (sha256 + per-server salt) so we don't store raw PII.
const VisitorSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true, unique: true, index: true },

    firstSeenAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now, index: true },

    pageViewCount: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 },

    ipHash: { type: String, default: "", index: true },
    userAgent: { type: String, default: "" },
    browser: { type: String, default: "" },
    os: { type: String, default: "" },
    device: { type: String, default: "desktop", enum: ["desktop", "mobile", "tablet"] },

    firstReferrer: { type: String, default: "" },
    firstLandingPath: { type: String, default: "" },
    firstUtm: {
      source: { type: String, default: "" },
      medium: { type: String, default: "" },
      campaign: { type: String, default: "" },
      content: { type: String, default: "" },
      term: { type: String, default: "" },
    },

    country: { type: String, default: "" },     // populated later if you wire a geo lookup
    city: { type: String, default: "" },

    linkedLeads: { type: [LinkedLeadSchema], default: [] },

    // Engagement score (0-100) recomputed on each pageview / lead submit. Used
    // by the admin to surface warm anonymous visitors before they convert.
    score: { type: Number, default: 0, index: true },

    notes: { type: String, default: "" },
    isBot: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

VisitorSchema.index({ lastSeenAt: -1 });
VisitorSchema.index({ score: -1, lastSeenAt: -1 });

export const Visitor = mongoose.model("Visitor", VisitorSchema);
