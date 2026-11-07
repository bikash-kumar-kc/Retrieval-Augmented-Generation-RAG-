import * as bcrypt from "bcrypt";
import { AppError } from "./error.js";

const BCRYPT_SALT = 12;

export const hashedPassword = async (password: string) => {
  console.log(typeof password);
  if (!password?.trim() || typeof password !== "string")
    throw new AppError(400, "password is required");
  return await bcrypt.hash(password, BCRYPT_SALT ?? 12);
};

export const verifyPassword = async (
  hashedPassword: string,
  rawPassword: string,
) => {
  if (
    !hashedPassword?.trim() ||
    typeof hashedPassword !== "string" ||
    !rawPassword?.trim() ||
    typeof rawPassword !== "string"
  )
    throw new AppError(400, "password is required");

  return await bcrypt.compare(rawPassword, hashedPassword);
};

let dummyHash: Promise<string> | undefined;

/** Burns the same CPU time when the email is unknown, so login timing doesn't reveal which emails exist. */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashedPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummyHash);
}
