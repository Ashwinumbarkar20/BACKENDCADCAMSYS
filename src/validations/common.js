import { z } from "zod";

export const objectIdParam = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId"),
});

export const slugParam = z.object({
  slug: z.string().min(1),
});

