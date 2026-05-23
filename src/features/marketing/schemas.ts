import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export type WaitlistVariant = "beta" | "launch";
