import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/axios/axios.client";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";

export default function LoginPage() {
  const { token, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/documents";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token && user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to connect to server !"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-md border border-[#e5e7eb] bg-white p-6 hover:shadow-2xl transition-all"
      >
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold text-[#171717]">
            Sign in to Generic RAG
          </h1>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-gray-700 font-semibold tracking-wide"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-[#e5e7eb] "
            placeholder="Enter your email..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#171717]">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password..."
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-[#e5e7eb]"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3b6d11] px-4 py-2 text-sm font-medium text-white hover:bg-[#2f5a0d] disabled:opacity-60"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            state={location.state}
            className="font-medium text-[#3b6d11] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
