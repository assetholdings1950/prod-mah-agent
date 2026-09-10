"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Search, Plus, X, RefreshCw, CheckCircle2, ChevronDown, Users, DollarSign, Eye, EyeOff, AlertCircle, Wallet, Settings, Mail
} from "lucide-react";
import { useAgent } from "../../../components/AgentContext";
import { api, apiFetch } from "../../../utils/api";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../../utils/toast-message/taost-message";
import type { Client, LedgerWallet, Wallet as WalletType } from "@/types";

function RelationshipBadge({ relationship }: { relationship?: Client["relationship"] }) {
  const map = {
    referred: { label: "Referred", cls: "bg-slate-50 text-slate-600 border-slate-200" },
    managed: { label: "Managed", cls: "bg-violet-50 text-violet-700 border-violet-100" },
    both: { label: "Referred + Managed", cls: "bg-sky-50 text-sky-700 border-sky-100" },
  } as const;
  const meta = map[relationship ?? "referred"] ?? map.referred;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export default function ClientsPage() {
  const { user, refreshProfile } = useAgent();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Client wallets modal states
  const [selectedWalletClient, setSelectedWalletClient] = useState<Client | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [clientWallets, setClientWallets] = useState<LedgerWallet[]>([]);
  const [clientSavedAddresses, setClientSavedAddresses] = useState<WalletType[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [activeWalletTab, setActiveWalletTab] = useState<"balances" | "addresses">("balances");

  const handleOpenWallets = async (client: Client) => {
    setSelectedWalletClient(client);
    setIsWalletModalOpen(true);
    setLoadingWallets(true);
    setActiveWalletTab("balances");
    try {
      const [walletRes, savedAddressesRes] = await Promise.all([
        apiFetch<{ wallets?: LedgerWallet[] }>(`/transactions/admin/fund-balances?userId=${client._id}&userModel=Client`),
        apiFetch<{ data?: WalletType[] }>(`/clients/${client._id}/wallets`)
      ]);
      setClientWallets(walletRes?.wallets || []);
      setClientSavedAddresses(savedAddressesRes?.data || []);
    } catch (err) {
      console.error("Error loading client wallets:", err);
      toastError("Failed to load wallets.");
    } finally {
      setLoadingWallets(false);
    }
  };

  const fetchClients = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      // Map filters if necessary. Status values are lowercase in DB (active, pending, suspended, blocked)
      const mappedStatus = statusFilter !== "All" ? statusFilter.toLowerCase() : undefined;
      const res = await api.getClients({
        agent: user._id,
        search: searchQuery.trim() || undefined,
        status: mappedStatus
      });

      if (res && res.status) {
        setClients(res.clients?.docs || res.data?.docs || []);
      } else {
        toastError(res?.message || "Failed to load referred clients.");
      }
    } catch (err) {
      console.error("Error loading clients:", err);
      toastError("Network error fetching referred clients.");
    } finally {
      setLoading(false);
    }
  }, [user?._id, searchQuery, statusFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleRegisterClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      toastError("All fields are required.");
      return;
    }

    const toastId = toastLoading("Registering client...", {
      description: `Creating secure investor account for ${firstName} ${lastName}`
    });
    setIsSubmittingClient(true);

    try {
      const res = await api.registerClient({
        firstName,
        lastName,
        email,
        password,
        referralCode: user?.referralCode // Auto-apply logged-in agent referral code
      });

      if (res && res.status) {
        toastUpdate(toastId, "success", "Client Registered Successfully", {
          description: "Login credentials have been emailed to the client. They will verify their email with an OTP at first login."
        });
        setIsRegisterModalOpen(false);
        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        
        // Refresh clients list and agent stats
        await fetchClients();
        await refreshProfile();
      } else {
        toastUpdate(toastId, "error", "Registration Failed", {
          description: res?.message || "Failed to register client."
        });
      }
    } catch (err) {
      console.error("Error registering client:", err);
      toastUpdate(toastId, "error", "Network Error", {
        description: "Failed to connect to registration service."
      });
    } finally {
      setIsSubmittingClient(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-navy">Client Directory</h1>
          <p className="text-xs text-navy-light/50">Investors you referred and clients assigned to you as Account Manager.</p>
        </div>

        <button
          onClick={() => setIsRegisterModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 bg-navy hover:bg-navy-light text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition duration-200 cursor-pointer self-start"
        >
          <Plus size={14} />
          <span>Register New Client</span>
        </button>
      </div>

      {/* Directory Table / Card Area */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
        
        {/* Filter and Search header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <Users size={16} className="text-navy-light/60 shrink-0" />
            <span className="text-xs font-bold text-navy uppercase tracking-wider">Investor Directory List</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <div className="relative group flex-1 sm:flex-initial">
              <Search size={13} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-navy transition-colors duration-200" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-56 bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-navy placeholder-slate-400 focus:bg-white focus:border-navy/40 focus:outline-none focus:ring-4 focus:ring-navy/5 transition-all duration-200 shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-3.5 pr-8 py-2 text-xs text-navy font-semibold focus:outline-none focus:bg-white focus:border-navy/40 focus:ring-4 focus:ring-navy/5 cursor-pointer appearance-none shadow-sm transition-all duration-200 min-w-[120px]"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending">Pending</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Blocked">Blocked</option>
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={fetchClients}
                className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition duration-150 cursor-pointer shrink-0"
                title="Refresh List"
              >
                <RefreshCw size={14} className={loading ? "animate-spin text-navy" : "text-slate-600"} />
              </button>
            </div>
          </div>
        </div>

        {/* Directory Content Area */}
        <div>
          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-navy/40 mb-2.5" />
              <span className="text-xs font-semibold text-slate-400">Loading Referred Clients...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-light px-4">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs">No investors linked to your referral code or assigned to you.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[9px]">
                      <th className="py-3 px-5">Investor Name</th>
                      <th className="py-3 px-5">Email Address</th>
                      <th className="py-3 px-5">Relationship</th>
                      <th className="py-3 px-5">Capital Invested</th>
                      <th className="py-3 px-5">KYC Status</th>
                      <th className="py-3 px-5">Account Status</th>
                      <th className="py-3 px-5">Registration Date</th>
                      <th className="py-3 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {clients.map((c) => {
                      const statusTone = 
                        c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        c.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-rose-50 text-rose-700 border-rose-100";
                      
                      const kycTone = 
                        c.kycStatus === "approved" ? "bg-sky-50 text-sky-700 border-sky-100" :
                        c.kycStatus === "under_review" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                        "bg-slate-50 text-slate-500 border-slate-100";
                      
                      return (
                        <tr key={c._id} className="hover:bg-slate-50/50 transition duration-150">
                          {/* Name */}
                          <td className="py-3.5 px-5 font-bold text-navy flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-navy/5 text-navy flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                              {c.firstName?.charAt(0) || ""}{c.lastName?.charAt(0) || ""}
                            </div>
                            <span className="text-navy font-bold">{c.firstName} {c.lastName}</span>
                          </td>
                          
                          {/* Email */}
                          <td className="py-3.5 px-5 text-slate-600 font-normal">{c.email}</td>

                          {/* Relationship */}
                          <td className="py-3.5 px-5">
                            <RelationshipBadge relationship={c.relationship} />
                          </td>

                          {/* Portfolio Capital */}
                          <td className="py-3.5 px-5 font-bold text-navy">
                            {(c.portfolioValue ?? 0) > 0 ? (
                              new Intl.NumberFormat('en-US', { style: 'currency', currency: c.preferredCurrency || "USD" }).format(c.portfolioValue ?? 0)
                            ) : (
                              <span className="text-slate-400 font-normal">$0.00</span>
                            )}
                          </td>
                          
                          {/* KYC status */}
                          <td className="py-3.5 px-5 capitalize">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${kycTone}`}>
                              {(c.kycStatus ?? "pending").replace("_", " ")}
                            </span>
                          </td>
                          
                          {/* Account status */}
                          <td className="py-3.5 px-5 capitalize">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusTone}`}>
                              <span className={`h-1 w-1 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                              {c.status}
                            </span>
                          </td>
                          
                          {/* Date */}
                          <td className="py-3.5 px-5 text-slate-500 font-normal">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </td>

                          {/* Actions (Manage + Wallets) */}
                          <td className="py-3.5 px-5 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Link
                                href={`/dashboard/clients/${c._id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-light text-white font-bold rounded-lg text-[10px] transition shadow-sm cursor-pointer"
                                title="Manage & Edit Profile"
                              >
                                <Settings size={12} />
                                <span>Manage</span>
                              </Link>

                              <button
                                onClick={() => handleOpenWallets(c)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-navy font-bold rounded-lg text-[10px] transition cursor-pointer"
                                title="View Wallets"
                              >
                                <Wallet size={12} />
                                <span>Wallets</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (Visible on mobile screens below md) */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
                {clients.map((c) => {
                  const statusTone = 
                    c.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    c.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-rose-50 text-rose-700 border-rose-100";
                  
                  const kycTone = 
                    c.kycStatus === "approved" ? "bg-sky-50 text-sky-700 border-sky-100" :
                    c.kycStatus === "under_review" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    "bg-slate-50 text-slate-500 border-slate-100";

                  const formattedCapital = (c.portfolioValue ?? 0) > 0 
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: c.preferredCurrency || "USD" }).format(c.portfolioValue ?? 0)
                    : "$0.00";

                  return (
                    <div key={c._id} className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                      {/* Header: Avatar, Name, Status Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-500/10 to-navy/10 text-navy flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-slate-200">
                            {c.firstName?.charAt(0) || ""}{c.lastName?.charAt(0) || ""}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-navy truncate">{c.firstName} {c.lastName}</h4>
                            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                              <Mail size={11} className="text-slate-400 shrink-0" />
                              <span>{c.email}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${statusTone}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.status === "active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                            {c.status}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold border uppercase tracking-wider ${kycTone}`}>
                            KYC: {(c.kycStatus ?? "pending").replace("_", " ")}
                          </span>
                          <RelationshipBadge relationship={c.relationship} />
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Capital Invested</span>
                          <span className="block text-xs font-bold text-navy mt-0.5">{formattedCapital}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Registered</span>
                          <span className="block text-xs font-semibold text-slate-600 mt-0.5">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href={`/dashboard/clients/${c._id}`}
                          className="flex items-center justify-center gap-1.5 w-full bg-navy hover:bg-navy-light text-white font-bold py-2 px-3 rounded-xl text-xs shadow-sm transition duration-150 cursor-pointer"
                        >
                          <Settings size={13} className="text-blue-300" />
                          <span>Manage Profile</span>
                        </Link>

                        <button
                          onClick={() => handleOpenWallets(c)}
                          className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-slate-100 border border-slate-200 text-navy font-bold py-2 px-3 rounded-xl text-xs shadow-xs transition duration-150 cursor-pointer"
                        >
                          <Wallet size={13} className="text-slate-600" />
                          <span>View Wallets</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/40 border-t border-slate-100 text-[10px] text-navy-light/50 font-bold flex items-center justify-between">
          <span>Total clients: {clients.length} records</span>
          <span className="font-light">Institutional Referral Registry</span>
        </div>
      </div>

      {/* =========================================================================
          REGISTER CLIENT MODAL
          ========================================================================= */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-navy cursor-pointer hover:bg-slate-50 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-navy mb-1">Register New Investor</h3>
            <p className="text-xs text-navy-light/50 mb-5">The client will be emailed these login credentials. Your referral code <strong>{user?.referralCode}</strong> is applied automatically.</p>

            <form onSubmit={handleRegisterClient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="investor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-3.5 pr-10 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-navy cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <span className="text-[9px] text-slate-400 block mt-1">These credentials are emailed to the client. On first login they verify their email via an OTP, then can change the password in their dashboard.</span>
              </div>

              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5 mt-1 text-[10px] text-sky-850">
                <AlertCircle size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Affiliate Registration Node</span>
                  <p className="font-light mt-0.5">This profile is initialized under your Singapore office code, ensuring correct commission routing.</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingClient}
                className="w-full bg-navy text-white hover:bg-navy-light font-bold py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingClient ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Registering Investor...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Register Account</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          CLIENT WALLETS MODAL
          ========================================================================= */}
      {isWalletModalOpen && selectedWalletClient && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative animate-scale-in max-h-[85vh] overflow-y-auto flex flex-col">
            <button
              onClick={() => setIsWalletModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-navy cursor-pointer hover:bg-slate-50 p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <h3 className="text-lg font-bold text-navy mb-1">Investor Wallets & Funding</h3>
            <p className="text-xs text-navy-light/50 mb-5">
              Review active wallet balances and saved transfer targets for <strong>{selectedWalletClient.firstName} {selectedWalletClient.lastName}</strong>.
            </p>

            {/* Modal Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-5 w-full sm:w-[280px]">
              <button
                type="button"
                onClick={() => setActiveWalletTab("balances")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${activeWalletTab === "balances" ? "bg-white text-navy shadow-sm" : "text-navy-light/60 hover:text-navy"}`}
              >
                Active Balances
              </button>
              <button
                type="button"
                onClick={() => setActiveWalletTab("addresses")}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${activeWalletTab === "addresses" ? "bg-white text-navy shadow-sm" : "text-navy-light/60 hover:text-navy"}`}
              >
                Saved Addresses
              </button>
            </div>

            {loadingWallets ? (
              <div className="py-12 text-center flex-1 flex flex-col justify-center items-center">
                <RefreshCw size={24} className="animate-spin text-navy/40 mb-2.5" />
                <span className="text-xs font-semibold text-slate-400">Syncing client wallets...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto min-h-[250px]">
                
                {/* Active Balances Tab */}
                {activeWalletTab === "balances" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {clientWallets.length === 0 ? (
                      <p className="text-xs text-slate-400 py-10 text-center col-span-full">No active wallets found in the system for this client.</p>
                    ) : (
                      clientWallets.map((w) => (
                        <div key={w._id} className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 hover:border-navy/15 transition duration-150">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-navy uppercase tracking-wider">{w.currency || "USD"} Ledger Wallet</span>
                            <span className="flex h-2 w-2 relative">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          </div>
                          
                          <div className="pt-1.5">
                            <span className="block text-[9px] uppercase font-bold text-slate-400">Available Balance</span>
                            <span className="text-lg font-extrabold text-navy leading-none mt-0.5 block">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD" }).format(w.balance || 0)}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 text-[10px] font-semibold text-navy">
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">Total Deposited</span>
                              <span className="font-bold text-emerald-600">+{new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD", maximumFractionDigits: 0 }).format(w.totalDeposited || 0)}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 uppercase font-bold">Total Withdrawn</span>
                              <span className="font-bold text-slate-500">-{new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency || "USD", maximumFractionDigits: 0 }).format(w.totalWithdrawn || 0)}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Saved Crypto Addresses Tab */}
                {activeWalletTab === "addresses" && (
                  <div className="space-y-3">
                    {clientSavedAddresses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-10 text-center">No saved crypto wallets or bank details target addresses found on file for this client.</p>
                    ) : (
                      clientSavedAddresses.map((addr) => (
                        <div key={addr._id} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-navy/15 transition duration-150">
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-navy uppercase tracking-wider">{addr.network || "Crypto Address"}</span>
                              {addr.label && <span className="text-[9px] font-bold bg-navy/5 text-navy px-1.5 py-0.5 rounded border border-navy/10">{addr.label}</span>}
                            </div>
                            <span className="block text-[10px] text-slate-500 font-mono mt-1 break-all select-all">{addr.walletAddress}</span>
                          </div>
                          
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                            addr.isPrimary ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            {addr.isPrimary ? "Primary" : "Secondary"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-navy font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer"
              >
                Close Console
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
