"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "../../utils/api";
import AuthLayout from "../../components/AuthLayout";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../utils/toast-message/taost-message";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg === "session_expired") {
      setError("Your session has expired. Please log in again.");
      toastError("Session Expired", { description: "Your session has expired. Please log in again." });
    }
    const verified = searchParams.get("verified");
    if (verified === "true") {
      setSuccess("Email verified successfully! Please log in.");
      toastSuccess("Email Verified!", { description: "You can now securely log in to your account." });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !password) {
      setError("Email and password are required.");
      toastError("Validation failed", { description: "Email and password are required." });
      setLoading(false);
      return;
    }

    const toastId = toastLoading("Authenticating...", {
      description: "Checking your credentials, please wait."
    });

    try {
      const res = await api.signIn({ email, password });
      if (res.status) {
        setSuccess("Login successful! Redirecting to portal...");
        toastUpdate(toastId, "success", "Welcome back!", {
          description: "Login successful! Redirecting to portal..."
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      } else {
        const errorMsg = res.message || "Invalid email or password.";
        setError(errorMsg);
        toastUpdate(toastId, "error", "Authentication failed", {
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMsg = "An error occurred. Please check your internet connection.";
      setError(errorMsg);
      toastUpdate(toastId, "error", "Connection error", {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Access Agent Portal"
      subtitle="Enter your credentials to manage operations"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-navy">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-medium transition animate-fade-in">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-medium transition animate-fade-in">
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
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[10px] font-medium text-slate-400 hover:text-navy hover:underline transition duration-150"
            >
              Forgot Password?
            </Link>
          </div>
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

        <div className="flex items-center pt-1">
          <input
            id="keep-logged-in"
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/20 transition duration-150 cursor-pointer"
          />
          <label htmlFor="keep-logged-in" className="ml-2 block text-xs text-slate-400 hover:text-navy cursor-pointer transition">
            Keep me logged in
          </label>
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
          <span>Secure Login</span>
        </button>

        <div className="text-center mt-4 text-xs leading-5 text-slate-400">
          Agent accounts are created by the Merlion administration team.
        </div>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
