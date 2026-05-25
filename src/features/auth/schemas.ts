import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    paymentMethod: z.enum(["card", "trial"]),
    cardNumber: z.string().optional(),
    expiry: z.string().optional(),
    cvc: z.string().optional(),
    zip: z.string().optional(),
    trialCode: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentMethod === "card") {
      const digits = (data.cardNumber ?? "").replace(/\s/g, "");
      if (digits.length < 13 || digits.length > 19) {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "Enter a valid card number",
        });
      }
      if (!data.expiry || !/^\d{2}\s?\/\s?\d{2}$/.test(data.expiry)) {
        ctx.addIssue({
          code: "custom",
          path: ["expiry"],
          message: "MM/YY",
        });
      }
      if (!data.cvc || data.cvc.length < 3 || data.cvc.length > 4) {
        ctx.addIssue({
          code: "custom",
          path: ["cvc"],
          message: "3 or 4 digits",
        });
      }
      if (!data.zip || data.zip.trim().length < 3) {
        ctx.addIssue({
          code: "custom",
          path: ["zip"],
          message: "Enter ZIP",
        });
      }
    } else if (data.paymentMethod === "trial") {
      if (!data.trialCode || data.trialCode.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["trialCode"],
          message: "Enter your trial code",
        });
      }
    }
  });
export type SignupInput = z.infer<typeof signupSchema>;
