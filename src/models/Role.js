import mongoose from "mongoose";

const PermissionEntrySchema = new mongoose.Schema(
  {
    resource: { type: String, required: true },
    actions: {
      view: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      edit: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      publish: { type: Boolean, default: false },
    },
  },
  { _id: false }
);

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: [PermissionEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const Role = mongoose.model("Role", RoleSchema);
