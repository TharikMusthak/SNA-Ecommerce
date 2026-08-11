import { z } from "zod";

const strongPassword = z
  .string()
  .min(12)
  .max(72)
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/\d/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character");
const indianPhone = z
  .string()
  .trim()
  .regex(/^(?:\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number")
  .transform((value) => value.replace(/^\+91/, ""));

export const registerSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100),
    last_name: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(190),
    phone: indianPhone.optional(),
    password: strongPassword,
    password_confirmation: z.string(),
    referral_code: z.string().trim().max(32).optional(),
    accept_terms: z.literal(true, { error: "Terms must be accepted" }),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export const loginSchema = z.object({
  login: z.string().trim().min(3).max(190),
  password: z.string().min(1).max(72),
});

export const tokenSchema = z.object({ token: z.string().min(32).max(512) });

export const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
});

export const resetPasswordSchema = tokenSchema
  .extend({
    password: strongPassword,
    password_confirmation: z.string(),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "Passwords do not match",
    path: ["password_confirmation"],
  });

export const addressSchema = z
  .object({
    full_name: z.string().trim().min(1).max(200),
    phone: indianPhone,
    address_line_1: z.string().trim().min(3).max(255),
    address_line_2: z.string().trim().max(255).optional().nullable(),
    landmark: z.string().trim().max(190).optional().nullable(),
    city: z.string().trim().min(1).max(120),
    district: z.string().trim().max(120).optional().nullable(),
    state: z.string().trim().min(1).max(120),
    country: z.string().trim().min(2).max(120).default("India"),
    postal_code: z.string().trim().min(3).max(20),
    address_type: z.enum(["home", "work", "other"]).default("home"),
    is_default: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (
      value.country.toLowerCase() === "india" &&
      !/^\d{6}$/.test(value.postal_code)
    ) {
      context.addIssue({
        code: "custom",
        path: ["postal_code"],
        message: "Indian PIN code must contain 6 digits",
      });
    }
  });

export const profileSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: indianPhone.optional().nullable(),
});

export { strongPassword };
