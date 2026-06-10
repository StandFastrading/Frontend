import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Beta entry: the only public auth path during the beta. Testers identify with
// their approved email + the access code from their invite — no passwords, no
// production signup. See features/beta on the backend.
export const betaEntrySchema = z.object({
  email: z.string().email("Enter a valid email"),
  accessCode: z.string().trim().min(1, "Enter your beta access code"),
});
export type BetaEntryInput = z.infer<typeof betaEntrySchema>;
