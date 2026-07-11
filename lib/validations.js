import { z } from 'zod';

// Any valid email is accepted. Account verification is done by phone (OTP),
// not by email domain.
export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character (!@#$%^&*)');

export const phoneSchema = z.string()
  .regex(/^\+?1?[-.\s]?([0-9]{3})[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, 'Please enter a valid US phone number');

export const otpSchema = z.string()
  .regex(/^\d{6}$/, 'OTP must be a 6-digit code');

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  phone_number: phoneSchema,
});

export const phoneSignupSchema = z.object({
  phone_number: phoneSchema,
});

export const phoneOTPSchema = z.object({
  phone_number: phoneSchema,
  otp: otpSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

