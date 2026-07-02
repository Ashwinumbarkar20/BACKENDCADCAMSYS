import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, default: "Owner" },
    isOwner: { type: Boolean, default: false, index: true },
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", default: null },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UserSchema.methods.verifyPassword = async function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

UserSchema.statics.hashPassword = async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const User = mongoose.model("User", UserSchema);
