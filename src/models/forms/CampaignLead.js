import mongoose from "mongoose";

// Leads captured by the navbar campaign modal (Settings → Integrations).
// Kept in their own collection so the admin can work them separately from the
// general contact inbox — the campaign name is the whole point of the segment.
const CampaignLeadSchema = new mongoose.Schema(
  {
    campaign: { type: String, default: "", index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    company: { type: String, default: "" },
    // Where the visitor was sent after submitting (the campaign destination).
    destinationUrl: { type: String, default: "" },
    sourcePage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const CampaignLead = mongoose.model("CampaignLead", CampaignLeadSchema);
