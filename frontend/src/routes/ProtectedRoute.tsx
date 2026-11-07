import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";


/** Wrap routes that need a logged-in user. Sends everyone else to /login and brings them back after. */
export default function ProtectedRoute() {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f9f0]" role="status" aria-label="Loading">
        <Loader2 className="size-6 animate-spin text-[#3b6d11]" />
      </div>
    );
  }
  if (!token || !user) return <Navigate to="/login" replace state={{ from: location }} />;
  
  return <Outlet />;
}
