import z from "zod";
import { USER_PURPOSES } from "../types/repository/userRepository.type.js";

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(8).max(128),
  purpose: z.enum(USER_PURPOSES),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(8).max(128),
});