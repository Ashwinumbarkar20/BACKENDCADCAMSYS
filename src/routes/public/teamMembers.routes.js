import { Router } from "express";
import { listTeamMembers } from "../../controllers/public/teamMembers.controller.js";

export const publicTeamMembersRouter = Router();

publicTeamMembersRouter.get("/", listTeamMembers);

