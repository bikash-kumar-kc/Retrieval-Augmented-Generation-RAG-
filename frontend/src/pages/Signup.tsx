import { useState, type FormEvent} from "react";
import { Loader2 } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/axios/axios.client";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";

// keep in sync with the purposes the API accepts
const PURPOSES = [
  { value: "personal", label: "Personal use" },
  { value: "business", label: "Business" },
  { value: "research", label: "Research" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

type Purpose = (typeof PURPOSES)[number]["value"];

const labelClass = "text-gray-700 font-semibold tracking-wide";

export default function SignupPage() {
  const { token, user, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/documents";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [purpose, setPurpose] = useState<Purpose | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (token && user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!purpose) {
      setError("Please choose how you will use Generic RAG.");
      return;
    }

    setSubmitting(true);
    try {
      await signup({ name: name.trim(), email: email.trim(), password, purpose });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to connect to server !"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-md border border-[#e5e7eb] bg-white p-6 hover:shadow-2xl transition-all">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-2xl font-semibold text-[#171717]">Create your Generic RAG account</h1>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className={labelClass}>Name</Label>
          <Input id="name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="border-[#e5e7eb]" placeholder="Enter your name..." />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className={labelClass}>Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="border-[#e5e7eb]" placeholder="Enter your email..." />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="purpose" className={labelClass}>How will you use it?</Label>
          <select
            id="purpose"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as Purpose | "")}
            className={`h-9 w-full min-w-0 rounded-md border border-[#e5e7eb] bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm ${
              purpose === "" ? "text-muted-foreground" : "text-[#171717]"
            }`}
          >
            <option value="" disabled>Select an option...</option>
            {PURPOSES.map((p) => (
              <option key={p.value} value={p.value} className="text-[#171717]">{p.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className={labelClass}>Password</Label>
          <Input id="password" type="password" autoComplete="new-password" placeholder="Create a password..." required minLength={8} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="border-[#e5e7eb]" />
          <p className="text-xs text-gray-500">At least 8 characters.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className={labelClass}>Confirm password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" placeholder="Re-enter your password..." required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="border-[#e5e7eb]" />
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
          Create account
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="font-medium text-[#3b6d11] hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}