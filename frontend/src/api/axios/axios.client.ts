import axios from "axios";

export const TOKEN_KEY = "genericRagToken";
export const UNAUTHORIZED_EVENT = "generic-rag:unauthorized";
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export const api = axios.create({ baseURL: API_BASE_URL });

export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
    if (err.code === "ERR_NETWORK") return "Cannot reach the server";
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
