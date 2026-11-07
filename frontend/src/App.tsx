import { Navigate, Route, Routes } from "react-router-dom";
import { Slide, ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLayout from "./layout/Applayout";
import DocumentsPage from "./pages/DocumentPage";
import ChatPage from "./pages/Chat";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/Signup";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* everything below needs a logged-in user */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/documents" replace />} />
      </Routes>
      <ToastContainer
        position="bottom-right"
        autoClose={4000}
        hideProgressBar={true}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        transition={Slide}
      />
    </AuthProvider>
  );
}
