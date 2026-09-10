"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, UserPlus, X, RefreshCw, Search, Eye, EyeOff, Mail, LockKeyhole,
  UserRound, Loader2, ShieldCheck, GitBranch, CheckCircle2,
} from "lucide-react";
import { useAgent } from "../../../components/AgentContext";
import { api } from "../../../utils/api";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../../utils/toast-message/taost-message";
import type { ReferredAgent } from "@/types";

const inputClass =
  "w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-navy placeholder-slate-400 focus:bg-white focus:border-navy/40 focus:outline-none focus:ring-4 focus:ring-navy/5 transition-all duration-200";
const labelClass = "block text-[10px] uppercase font-bold text-navy/60 mb-1.5 tracking-[0.12em]";

function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
    status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
    "bg-rose-50 text-rose-700 border-rose-100";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${tone}`}>
      <span className={`h-1 w-1 rounded-full ${status === "active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
      {status || "—"}
    </span>
  );
}

function KycBadge({ status }: { status?: string }) {
  const tone =
    status === "approved" ? "bg-sky-50 text-sky-700 border-sky-100" :
    status === "under_review" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
    "bg-slate-50 text-slate-500 border-slate-100";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${tone}`}>
      {(status ?? "pending").replace("_", " ")}
    </span>
  );
}

export default function TeamPage() {
  const { user } = useAgent();

  const [agents, setAgents] = useState<ReferredAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getReferredAgents({ search: searchQuery.trim() || undefined });
      if (res && res.status) {
        setAgents(res.agents?.docs || []);
      } else {
        toastError(res?.message || "Failed to load your referral agents.");
      }
    } catch (err) {
      console.error("Error loading referral agents:", err);
      toastError("Network error fetching referral agents.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !normalizedEmail || !password) {
      toastError("Complete all required agent details.");
      return;
    }
    if (password.length < 8) {
      toastError("Password must contain at least 8 characters.");
      return;
    }

    const toastId = toastLoading("Creating agent account...", {
      description: `Setting up ${firstName} ${lastName} under your referral network`,
    });
    setSubmitting(true);

    try {
      const res = await api.referAgent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
      });

      if (res && res.status) {
        toastUpdate(toastId, "success", "Agent Account Created", {
          description: `Agent ID: ${res.agent?.agentId ?? "assigned"}. The account is active and email-verified.`,
        });
        setIsModalOpen(false);
        resetForm();
        await fetchAgents();
      } else {
        toastUpdate(toastId, "error", "Could Not Create Agent", {
          description: res?.message || "Agent account could not be created.",
        });
      }
    } catch (err) {
      console.error("Error creating referral agent:", err);
      toastUpdate(toastId, "error", "Network Error", {
        description: "Failed to connect to the agent creation service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toastSuccess("Referral Code Copied");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-navy">Referral Agents</h1>
          <p className="text-xs text-navy-light/50">
            Agents you have personally introduced. New accounts are created active and email-verified, linked to your referral code.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-navy hover:bg-navy-light text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition duration-200 cursor-pointer self-start"
        >
          <UserPlus size={14} />
          <span>Create Agent Account</span>
        </button>
      </div>

      {/* Your referral node card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-navy/5 text-navy flex items-center justify-center shrink-0">
            <GitBranch size={18} />
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Referral Code</span>
            <button
              onClick={copyReferralCode}
              className="text-sm font-bold text-navy font-mono tracking-wider hover:text-navy-light cursor-pointer"
              title="Copy referral code"
            >
              {user?.referralCode || "—"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:gap-8">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Agents Referred</span>
            <span className="block text-lg font-extrabold text-navy leading-tight">{agents.length}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active</span>
            <span className="block text-lg font-extrabold text-emerald-600 leading-tight">
              {agents.filter((a) => a.status === "active").length}
            </span>
          </div>
        </div>
      </div>

      {/* Directory table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Users size={16} className="text-navy-light/60 shrink-0" />
            <span className="text-xs font-bold text-navy uppercase tracking-wider">My Referral Network</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative group flex-1 sm:flex-initial">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-navy transition-colors" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-navy placeholder-slate-400 focus:bg-white focus:border-navy/40 focus:outline-none focus:ring-4 focus:ring-navy/5 transition-all shadow-sm"
              />
            </div>
            <button
              onClick={fetchAgents}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition duration-150 cursor-pointer shrink-0"
              title="Refresh list"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-navy" : "text-slate-600"} />
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-navy/40 mb-2.5" />
              <span className="text-xs font-semibold text-slate-400">Loading referral agents...</span>
            </div>
          ) : agents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-light px-4">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs">You have not referred any agents yet. Use “Create Agent Account” to add one.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="py-3 px-5">Agent</th>
                      <th className="py-3 px-5">Agent ID</th>
                      <th className="py-3 px-5">Email</th>
                      <th className="py-3 px-5">Referral Code</th>
                      <th className="py-3 px-5">Clients</th>
                      <th className="py-3 px-5">KYC</th>
                      <th className="py-3 px-5">Status</th>
                      <th className="py-3 px-5">Referred On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {agents.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="py-3.5 px-5 font-bold text-navy">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-navy/5 text-navy flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                              {a.firstName?.charAt(0) || ""}{a.lastName?.charAt(0) || ""}
                            </div>
                            <span>{a.fullName || `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 font-mono">{a.agentId || "—"}</td>
                        <td className="py-3.5 px-5 text-slate-600 font-normal">{a.email}</td>
                        <td className="py-3.5 px-5 text-slate-600 font-mono">{a.referralCode || "—"}</td>
                        <td className="py-3.5 px-5 font-bold text-navy">
                          {a.totalClients ?? 0}
                          <span className="text-slate-400 font-normal"> ({a.activeClients ?? 0} active)</span>
                        </td>
                        <td className="py-3.5 px-5"><KycBadge status={a.kycStatus} /></td>
                        <td className="py-3.5 px-5"><StatusBadge status={a.status} /></td>
                        <td className="py-3.5 px-5 text-slate-500 font-normal">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="block md:hidden p-3 space-y-3">
                {agents.map((a) => (
                  <div key={a._id} className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500/10 to-navy/10 text-navy flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                          {a.firstName?.charAt(0) || ""}{a.lastName?.charAt(0) || ""}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-navy truncate">
                            {a.fullName || `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim()}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail size={11} className="text-slate-400 shrink-0" />
                            <span>{a.email}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={a.status} />
                        <KycBadge status={a.kycStatus} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100 text-[11px]">
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Agent ID</span>
                        <span className="block font-mono font-bold text-navy mt-0.5">{a.agentId || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Referral Code</span>
                        <span className="block font-mono font-bold text-navy mt-0.5">{a.referralCode || "—"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Clients</span>
                        <span className="block font-bold text-navy mt-0.5">{a.totalClients ?? 0} ({a.activeClients ?? 0} active)</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Referred On</span>
                        <span className="block font-semibold text-slate-600 mt-0.5">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-50/40 border-t border-slate-100 text-[10px] text-navy-light/50 font-bold flex items-center justify-between">
          <span>Total referral agents: {agents.length}</span>
          <span className="font-light">Agent Referral Network</span>
        </div>
      </div>

      {/* =========================================================================
          CREATE AGENT MODAL — mirrors the admin "Create Agent Account" form
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full shadow-2xl relative animate-scale-in overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-5">
              <div>
                <h3 className="text-base font-extrabold text-navy">Create Agent Account</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  The account will be active and email-verified immediately.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { if (!submitting) setIsModalOpen(false); }}
                disabled={submitting}
                aria-label="Close create agent dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="space-y-4 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>First Name *</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        autoFocus
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </label>
                  <label>
                    <span className={labelClass}>Last Name *</span>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        required
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </label>
                </div>

                <label>
                  <span className={labelClass}>Email Address *</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="agent@example.com"
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                </label>

                <label>
                  <span className={labelClass}>Password *</span>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className={`${inputClass} px-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-navy cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                {/* Referral node info — sponsor is forced to the logged-in agent */}
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5 text-[10px] text-sky-900">
                  <ShieldCheck size={14} className="text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Linked to your referral network</span>
                    <p className="font-light mt-0.5">
                      This agent is created under your referral code
                      {user?.referralCode ? <strong> {user.referralCode}</strong> : ""}. They receive their own
                      referral code to share, and admins will see you listed as their sponsor. Commission is
                      earned on your referred clients&apos; investments only — not on referring another agent.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => { if (!submitting) setIsModalOpen(false); }}
                  disabled={submitting}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy px-5 text-xs font-bold text-white transition hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {submitting ? "Creating Agent…" : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
