import { z } from "zod";

export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  bootstrapKey: z.string().min(1).optional(),
});

