import mongoose from "mongoose";

const TeamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: "" },
    photo: { type: mongoose.Schema.Types.ObjectId, ref: "Media" },
    bio: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export const TeamMember = mongoose.model("TeamMember", TeamMemberSchema);

