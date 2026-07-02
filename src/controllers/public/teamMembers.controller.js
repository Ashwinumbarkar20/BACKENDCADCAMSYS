import { TeamMember } from "../../models/TeamMember.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ok } from "../../utils/apiResponse.js";

export const listTeamMembers = asyncHandler(async (_req, res) => {
  const items = await TeamMember.find({})
    .sort({ order: 1, createdAt: 1 })
    .populate([{ path: "photo" }])
    .lean();
  return ok(res, items);
});

