"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { api } from "../../utils/api";
import AuthLayout from "../../components/AuthLayout";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../utils/toast-message/taost-message";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      toastError("Validation failed", { description: "Please fill in all fields." });
      setLoading(false);
      return;
    }

    const toastId = toastLoading("Updating password...", {
      description: "Please wait while we update your credentials."
    });

    try {
      const res = await api.forgotPassword({ email, password });
      if (res.status) {
        setSuccess("Password updated successfully! Redirecting to login...");
        toastUpdate(toastId, "success", "Password Updated!", {
          description: "Your password has been updated successfully! Redirecting to login..."
        });
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        const errorMsg = res.message || "Failed to update password. Please check your details.";
        setError(errorMsg);
        toastUpdate(toastId, "error", "Reset failed", {
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMsg = "An error occurred. Please try again.";
      setError(errorMsg);
      toastUpdate(toastId, "error", "Error resetting password", {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Reset Password" 
      subtitle="Enter your email and choose a secure new password"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-navy">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-medium transition animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-medium transition animate-fade-in">
            {success}
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Mail size={16} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@merlionassetholdings.com"
              required
              className="premium-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5">
            New Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Lock size={16} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="premium-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-navy/70 transition duration-150 cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="premium-btn"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Lock size={16} />
          )}
          <span>Reset Password</span>
        </button>

        <div className="text-center mt-4">
          <Link href="/login" className="text-xs text-navy hover:underline font-semibold flex items-center justify-center gap-1.5 transition duration-150">
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
