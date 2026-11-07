import { api } from "./axios/axios.client";

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  purpose?: string;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  /** one of: personal, business, research, education, other (the API checks it) */
  purpose: string;
}

export const authApi = {
  async login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: AuthUser }>(
      "/api/auth/login",
      { email, password },
    );
    return data;
  },
  async profile() {
    const { data } = await api.get<{ user: AuthUser }>("/api/auth/profile");
    return data.user;
  },
  async signup(input: {
    name: string;
    email: string;
    password: string;
    purpose: string;
  }) {
    const { data } = await api.post<{ token: string; user: AuthUser }>(
      "/api/auth/signup",
      input,
    );
    return data;
  },
};
