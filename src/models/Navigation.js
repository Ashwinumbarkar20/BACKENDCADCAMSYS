import mongoose from "mongoose";

const NavItemSchema = new mongoose.Schema({ label: { type: String, required: true }, url: { type: String, required: true } }, { _id: false });
NavItemSchema.add({ children: { type: [NavItemSchema], default: [] } });

const NavigationSchema = new mongoose.Schema(
  {
    singletonKey: { type: String, default: "global", unique: true, index: true },
    items: { type: [NavItemSchema], default: [] },
  },
  { timestamps: true }
);

export const Navigation = mongoose.model("Navigation", NavigationSchema);

