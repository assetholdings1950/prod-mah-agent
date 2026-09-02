"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle2, ShieldAlert, Loader2, ArrowRight } from "lucide-react";
import { api } from "../../utils/api";
import AuthLayout from "../../components/AuthLayout";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../utils/toast-message/taost-message";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Load email from query param or sessionStorage
  useEffect(() => {
    let emailParam = searchParams.get("email");
    if (!emailParam && typeof window !== "undefined") {
      emailParam = sessionStorage.getItem("pending_otp_email");
    }
    if (emailParam) {
      setEmail(emailParam);
    } else {
      setError("No email address found. Please start sign-up again.");
      toastError("Verification Error", { description: "No email address found. Please start sign-up again." });
    }
  }, [searchParams]);

  // Countdown timer for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Email address is missing.");
      toastError("Verification Error", { description: "Email address is missing." });
      setLoading(false);
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      toastError("Validation failed", { description: "Please enter a valid 6-digit code." });
      setLoading(false);
      return;
    }

    const toastId = toastLoading("Verifying your code...", {
      description: "Please wait while we verify your OTP."
    });

    try {
      const res = await api.verifyOtp({ email, otp });
      if (res.status) {
        setSuccess("Email verified successfully! Redirecting to login...");
        toastUpdate(toastId, "success", "Email Verified!", {
          description: "Your account is verified successfully! Redirecting to login..."
        });
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("pending_otp_email");
        }
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 2000);
      } else {
        const errorMsg = res.message || "Invalid or expired OTP. Please try again.";
        setError(errorMsg);
        toastUpdate(toastId, "error", "Verification failed", {
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMsg = "Verification failed. Please try again.";
      setError(errorMsg);
      toastUpdate(toastId, "error", "Verification error", {
        description: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    setError("");
    setSuccess("");
    setResending(true);

    const toastId = toastLoading("Requesting new OTP code...", {
      description: "Please wait while we generate a new code."
    });

    try {
      const res = await api.resendOtp({ email });
      if (res.status) {
        setSuccess("A new OTP code has been sent to your email.");
        toastUpdate(toastId, "success", "New OTP Sent", {
          description: `A new OTP code has been successfully sent to ${email}`
        });
        setTimer(300);
        setCanResend(false);
      } else {
        const errorMsg = res.message || "Failed to resend OTP. Please try again.";
        setError(errorMsg);
        toastUpdate(toastId, "error", "Resend failed", {
          description: errorMsg
        });
      }
    } catch (err) {
      const errorMsg = "Network error while resending OTP.";
      setError(errorMsg);
      toastUpdate(toastId, "error", "Resend error", {
        description: errorMsg
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout 
      title="Verify Account" 
      subtitle="Enter the 6-digit security code sent to your email"
    >
      <form onSubmit={handleSubmit} className="space-y-5 font-sans text-navy">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2 transition animate-fade-in">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl text-xs font-medium flex items-start gap-2 transition animate-fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {email && (
          <div className="bg-slate-50 border border-slate-100 text-slate-600 px-4 py-3 rounded-xl text-xs flex items-center gap-3">
            <Mail size={16} className="text-slate-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold block text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Sending code to</span>
              <span className="font-medium text-sm text-navy">{email}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold tracking-wider text-slate-500 uppercase mb-1.5">
            Verification Code
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setOtp(val);
            }}
            placeholder="000000"
            required
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3 text-center text-2xl font-bold tracking-[0.4em] focus:outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/5 transition-all duration-300 placeholder:tracking-normal placeholder:font-light text-navy placeholder-slate-300"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="premium-btn"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>Verify & Activate</span>
        </button>

        <div className="flex flex-col items-center justify-center gap-2 mt-4 pt-2">
          {timer > 0 ? (
            <div className="text-xs text-slate-400">
              Resend code in <span className="font-semibold text-navy">{formatTime(timer)}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs font-semibold text-navy hover:underline flex items-center gap-1.5 transition duration-150 disabled:opacity-50 cursor-pointer"
            >
              {resending && <Loader2 size={12} className="animate-spin" />}
              Resend OTP Code
            </button>
          )}

          <div className="text-xs mt-2">
            <Link href="/login" className="text-navy hover:underline font-semibold flex items-center gap-1">
              Back to login <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent"></div>
      </div>
    }>
      <VerifyOtpForm />
    </Suspense>
  );
}
