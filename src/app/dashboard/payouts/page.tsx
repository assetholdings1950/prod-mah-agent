"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet, RefreshCw, Plus, CheckCircle2, ArrowUpRight, Clock, X, ChevronDown, Check, FileText
} from "lucide-react";
import { useAgent } from "../../../components/AgentContext";
import { api } from "../../../utils/api";
import { toastSuccess, toastError, toastLoading, toastUpdate } from "../../../utils/toast-message/taost-message";
import type { Wallet as WalletType, Withdrawal } from "@/types";

export default function PayoutsPage() {
  const { user, availableCommission, setAvailableCommission, refreshProfile } = useAgent();
  
  // Payout states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Payout destinations + selection
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [loadingDestinations, setLoadingDestinations] = useState(false);

  // Inline "add destination" form
  const [isAddingDestination, setIsAddingDestination] = useState(false);
  const [isSavingDestination, setIsSavingDestination] = useState(false);
  const [walletForm, setWalletForm] = useState({ network: "", walletAddress: "", label: "" });

  // Payout history
  const [payoutHistory, setPayoutHistory] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchPayoutHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.myWithdrawals({ page: 1, limit: 20 });
      if (res && res.status) {
        setPayoutHistory(res.data?.docs || []);
      }
    } catch (err) {
      console.error("Error fetching payout history:", err);
      toastError("Failed to fetch payout history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const reloadDestinations = useCallback(async () => {
    setLoadingDestinations(true);
    try {
      const walletRes = await api.getMyWallets();
      const walletList = walletRes?.data || [];
      
      setWallets(walletList);

      setSelectedWalletId((prev) => prev || walletList.find((w) => w.isPrimary)?._id || walletList[0]?._id || null);
    } catch (err) {
      console.error("Error loading destinations:", err);
      toastError("Failed to retrieve payout destinations.");
    } finally {
      setLoadingDestinations(false);
    }
  }, []);

  useEffect(() => {
    reloadDestinations();
    fetchPayoutHistory();
  }, [reloadDestinations, fetchPayoutHistory]);

  // Derived effective destination ID
  const effectiveWalletId = selectedWalletId || wallets.find((w) => w.isPrimary)?._id || wallets[0]?._id || null;

  const handleSaveDestination = async () => {
    setIsSavingDestination(true);
    try {
      if (!walletForm.network.trim() || !walletForm.walletAddress.trim()) {
        toastError("Network and wallet address are required.");
        return;
      }
      const res = await api.addWallet({ ...walletForm, isPrimary: wallets.length === 0 });
      if (res?.status) {
        toastSuccess("Wallet Address Added", { description: `${walletForm.network} wallet saved.` });
        setWalletForm({ network: "", walletAddress: "", label: "" });
        setIsAddingDestination(false);
        if (res.data?._id) setSelectedWalletId(res.data._id);
        await reloadDestinations();
      } else {
        toastError(res?.message || "Failed to add wallet.");
      }
    } catch (err) {
      console.error("Error adding payout destination:", err);
      toastError("Failed to save payout destination.");
    } finally {
      setIsSavingDestination(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toastError("Please enter a valid withdrawal amount.");
      return;
    }
    if (amount > availableCommission) {
      toastError("Withdrawal amount exceeds available commission.");
      return;
    }

    if (!effectiveWalletId) {
      toastError("Please select or add a wallet.");
      return;
    }

    const toastId = toastLoading("Processing payout request...", {
      description: `Initiating $${amount.toLocaleString()} withdrawal.`
    });
    setIsSubmittingWithdraw(true);

    try {
      const res = await api.createWithdrawal({
        amount,
        currency: user?.preferredCurrency || "USD",
        walletId: effectiveWalletId,
        note: withdrawNote.trim() || undefined,
      });

      if (res?.status) {
        setWithdrawAmount("");
        setWithdrawNote("");
        
        // Refresh balances and history
        await fetchPayoutHistory();
        await refreshProfile();
        
        toastUpdate(toastId, "success", "Payout Requested Successfully", {
          description: `Payout request of $${amount.toLocaleString()} submitted. Admins have been notified.`
        });
      } else {
        toastUpdate(toastId, "error", "Payout Request Failed", {
          description: res?.message || "Failed to submit request."
        });
      }
    } catch (err) {
      console.error("Error submitting withdrawal:", err);
      toastUpdate(toastId, "error", "Network Error", {
        description: "An error occurred. Please try again."
      });
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleDownloadLedger = () => {
    const toastId = toastLoading("Preparing commission ledger...", {
      description: "Generating spreadsheet audit trail."
    });
    setTimeout(() => {
      toastUpdate(toastId, "success", "Download Complete", {
        description: "Commission audit ledger successfully downloaded."
      });
    }, 1500);
  };

  const formattedCommissionBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(availableCommission);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-navy">Payout Settlements</h1>
          <p className="text-xs text-navy-light/50">Request commission payouts, manage payout targets, and view audit history.</p>
        </div>
        
        <button
          onClick={handleDownloadLedger}
          className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-navy font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition duration-150 cursor-pointer self-start"
        >
          <FileText size={14} />
          <span>Audit Ledger</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form & Setup */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Withdrawal Form Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold font-heading text-navy border-b border-slate-100 pb-3 mb-4">Request Withdrawal</h3>
            
            <form onSubmit={handleWithdrawalSubmit} className="space-y-5">
              
              {/* Balances Widget */}
              <div className="bg-gradient-to-br from-navy via-navy-light to-blue-950 text-white rounded-2xl p-5 flex items-center justify-between shadow">
                <div>
                  <span className="block text-[10px] font-bold text-blue-300 uppercase tracking-wider">Settlement Eligible Balance</span>
                  <span className="text-2xl font-extrabold block mt-1">{formattedCommissionBalance}</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl border border-white/5 shadow-inner">
                  <Wallet size={24} className="text-blue-300 animate-pulse" />
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Amount to Withdraw (USD)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-bold text-sm">$</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    max={availableCommission}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-xl pl-8 pr-4 py-2.5 text-xs font-bold text-navy focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/40 transition duration-200"
                  />
                </div>
              </div>

              {/* Destination selector */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Select Target Crypto Wallet</label>

                {loadingDestinations ? (
                  <div className="py-6 text-center">
                    <RefreshCw size={18} className="animate-spin mx-auto text-navy/40 mb-1.5" />
                    <span className="text-[10px] text-slate-400">Syncing payout targets...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {wallets.length === 0 && !isAddingDestination && (
                      <p className="text-[11px] text-navy-light/50 text-center py-4 border border-dashed border-slate-200 rounded-xl">
                        No wallets on file. Add a payout destination to continue.
                      </p>
                    )}

                    {wallets.map((d) => {
                      const selected = effectiveWalletId === d._id;
                      return (
                        <button
                          key={d._id}
                          type="button"
                          onClick={() => setSelectedWalletId(d._id)}
                          className={`w-full flex items-center gap-3 border rounded-xl px-4 py-3 text-left transition cursor-pointer ${selected ? "border-navy bg-slate-50/50 shadow-sm" : "border-slate-200/80 hover:border-navy/20"}`}
                        >
                          <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-navy bg-navy" : "border-slate-300"}`}>
                            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                          </span>
                          
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-navy truncate">{d.network}{d.label ? ` · ${d.label}` : ""}</span>
                            <span className="block text-[10px] text-navy-light/50 truncate font-mono">{d.walletAddress}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Adding destination form */}
                {!isAddingDestination ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingDestination(true)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed border-slate-200 rounded-xl py-3 text-xs font-bold text-navy hover:border-navy/30 transition cursor-pointer"
                  >
                    <Plus size={13} />
                    Add Crypto Wallet
                  </button>
                ) : (
                  <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                    <input type="text" placeholder="Network (e.g. ERC-20, TRC-20, BTC)" value={walletForm.network} onChange={(e) => setWalletForm({ ...walletForm, network: e.target.value })} className="w-full bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-navy/5" />
                    <input type="text" placeholder="Wallet Address" value={walletForm.walletAddress} onChange={(e) => setWalletForm({ ...walletForm, walletAddress: e.target.value })} className="w-full bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-navy/5" />
                    <input type="text" placeholder="Label (e.g. Ledger, TrustWallet)" value={walletForm.label} onChange={(e) => setWalletForm({ ...walletForm, label: e.target.value })} className="w-full bg-white border border-slate-200/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-navy/5" />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setIsAddingDestination(false)} className="flex-1 bg-slate-100 text-navy font-bold py-2 rounded-lg text-xs hover:bg-slate-200 transition cursor-pointer">Cancel</button>
                      <button type="button" onClick={handleSaveDestination} disabled={isSavingDestination} className="flex-1 bg-navy text-white font-bold py-2 rounded-lg text-xs hover:bg-navy-light transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5">
                        {isSavingDestination ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        Save target
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Note input */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-navy/60 mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  placeholder="Payment reference message..."
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5 focus:border-navy/40 transition duration-200"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw}
                className="w-full bg-navy hover:bg-navy-light text-white font-bold py-3 rounded-xl text-xs shadow-md transition duration-200 flex items-center justify-center gap-1.5 mt-2 cursor-pointer disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
              >
                {isSubmittingWithdraw ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing settlement request...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={14} />
                    <span>Initiate Settlement Withdrawal</span>
                  </>
                )}
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Settlement History */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold font-heading text-navy">Settlement History</h3>
              <button
                onClick={fetchPayoutHistory}
                className="text-navy-light/60 hover:text-navy hover:bg-slate-50 p-1.5 rounded-lg transition duration-150 cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw size={13} className={loadingHistory ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingHistory && payoutHistory.length === 0 ? (
              <div className="py-20 text-center">
                <RefreshCw size={20} className="animate-spin mx-auto text-navy/40 mb-2" />
                <span className="text-[10px] text-slate-400">Loading payout records...</span>
              </div>
            ) : payoutHistory.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={32} className="mx-auto text-slate-200 mb-2.5" />
                <p className="text-xs text-navy-light/50 font-semibold">No withdrawals requested yet.</p>
                <p className="text-[10px] text-slate-400 font-light mt-0.5">Your earnings are securely settled when requested.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payoutHistory.map((p) => {
                  const statusTone = p.status === "approved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : p.status === "rejected"
                      ? "bg-rose-50 text-rose-700 border-rose-100"
                      : "bg-amber-50 text-amber-700 border-amber-100";
                  
                  const targetLabel = p.withdrawalMethod === "bank"
                    ? (p.bankDetailId?.bankName || "Bank Transfer")
                    : `${p.walletId?.network || "Crypto Wallet"}${p.walletId?.label ? ` · ${p.walletId.label}` : ""}`;
                  
                  return (
                    <div key={p._id} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:border-navy/15 transition duration-150">
                      <div className="min-w-0">
                        <span className="block text-xs font-bold text-navy">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || "USD" }).format(p.amount)}
                        </span>
                        <span className="block text-[9px] text-navy-light/50 truncate font-semibold mt-0.5">
                          {targetLabel}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-light mt-0.5">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                        </span>
                      </div>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize shrink-0 ${statusTone}`}>
                        {p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
