import { UserPurpose } from "../types/repository/userRepository.type.js";

export interface UserRecord {
  userId: string;
  name: string;
  email: string;
  passwordHash: string;
  purpose: UserPurpose;
  createdAt: string;
}

export interface UserRepositoryContract {
  create(user: Omit<UserRecord, "createdAt">): Promise<void>;

  findByEmail(email: string): Promise<UserRecord | null>;

  findById(userId: string): Promise<UserRecord | null>;
}
