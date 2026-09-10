"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award, TrendingUp, Users, Wallet, Activity, Mail, User, ShieldCheck, Layers, Copy, Check, Loader2, ChevronRight, Plus, GitBranch, UserPlus
} from "lucide-react";
import { useAgent } from "../../components/AgentContext";
import { toastSuccess } from "../../utils/toast-message/taost-message";
import { api } from "../../utils/api";
import type { Client, ReferredAgent } from "@/types";
import { SIP_COMMISSION_TIERS, tierRangeLabel } from "@/config/commissionTiers";

export default function DashboardPage() {
  const { user, availableCommission } = useAgent();
  const [chartTab, setChartTab] = useState<"investment" | "commission">("investment");
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [agents, setAgents] = useState<ReferredAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [clientInvestmentSum, setClientInvestmentSum] = useState<number | null>(null);
  // Counts derived from the full directory (referred + assigned-as-manager),
  // not just the referral-only profile stats.
  const [directoryTotal, setDirectoryTotal] = useState<number | null>(null);
  const [directoryActive, setDirectoryActive] = useState<number | null>(null);

  useEffect(() => {
    const fetchDashboardClients = async () => {
      if (!user?._id) return;
      try {
        const res = await api.getClients({ agent: user._id, limit: 100 });
        if (res && res.status) {
          const clientDocs: Client[] = res.clients?.docs || res.data?.docs || [];
          setClients(clientDocs.slice(0, 5));
          setDirectoryTotal(res.clients?.totalDocs ?? res.data?.totalDocs ?? clientDocs.length);
          setDirectoryActive(clientDocs.filter((c) => String(c.status).toLowerCase() === "active").length);
          const totalInvested = clientDocs.reduce((acc, c: any) => acc + (c.portfolioValue || c.totalInvestedAmount || c.activeInvestmentAmount || 0), 0);
          setClientInvestmentSum(totalInvested);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard clients:", err);
      } finally {
        setClientsLoading(false);
      }
    };
    const fetchDashboardAgents = async () => {
      if (!user?._id) return;
      try {
        const res = await api.getReferredAgents({ limit: 5 });
        if (res && res.status) {
          const agentDocs: ReferredAgent[] = res.agents?.docs || [];
          setAgents(agentDocs.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to fetch dashboard agents:", err);
      } finally {
        setAgentsLoading(false);
      }
    };
    if (user?._id) {
      fetchDashboardClients();
      fetchDashboardAgents();
    }
  }, [user?._id]);

  // Calculated Metrics
  const fullName = user?.fullName || `${user?.firstName || "Agent"} ${user?.lastName || ""}`.trim();
  const agentLevel = user?.agentLevel ? (user.agentLevel.charAt(0).toUpperCase() + user.agentLevel.slice(1) + " Partner") : "Basic Partner";
  const commissionPercentage = user?.commissionPercentage !== undefined ? `${user.commissionPercentage.toFixed(1)}%` : "2.0%";

  // Prefer the live directory count (covers referred + assigned clients); fall
  // back to the referral-only profile stat until the directory has loaded.
  const totalClientsCount = directoryTotal ?? user?.totalClients ?? clients.length ?? 0;
  const activeClientsCount = directoryActive ?? user?.activeClients ?? 0;
  
  const totalInvestmentNum = clientInvestmentSum !== null 
    ? Math.max(clientInvestmentSum, user?.totalInvestmentVolume || 0)
    : (user?.totalInvestmentVolume || 0);
  
  const formattedInvestmentVolume = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalInvestmentNum);
  const formattedCommissionBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(availableCommission);

  // SVG Chart Setup
  const chartMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  
  // Create relative trends based on actual data
  const investmentTrend = [
    totalInvestmentNum * 0.5,
    totalInvestmentNum * 0.6,
    totalInvestmentNum * 0.72,
    totalInvestmentNum * 0.85,
    totalInvestmentNum * 0.9,
    totalInvestmentNum
  ];
  
  const commissionTrend = [
    availableCommission * 0.4,
    availableCommission * 0.52,
    availableCommission * 0.65,
    availableCommission * 0.78,
    availableCommission * 0.88,
    availableCommission
  ];

  const activeTrend = chartTab === "investment" ? investmentTrend : commissionTrend;
  const maxVal = Math.max(...activeTrend, 100); // prevent division by zero
  const minVal = Math.min(...activeTrend) * 0.9;

  const getY = (val: number) => {
    if (maxVal === minVal) return 90;
    return 160 - ((val - minVal) / (maxVal - minVal)) * 120;
  };

  const points = activeTrend.map((val, idx) => ({
    x: 40 + idx * 104,
    y: getY(val),
    val,
    month: chartMonths[idx]
  }));

  const linePath = "M " + points.map(p => `${p.x},${p.y}`).join(" L ");
  const areaPath = linePath + ` L ${points[points.length - 1].x},165 L ${points[0].x},165 Z`;

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toastSuccess("Referral Code Copied");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-navy/5 text-navy border border-navy/10 mb-2">
            <Award size={10} className="text-amber-600" />
            <span>{agentLevel} Network</span>
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-navy leading-tight">Welcome back, {user?.firstName || "Partner"}</h1>
          <p className="text-sm text-navy-light/60 font-light mt-1">Here is a real-time summary of your client network performance and commission accruals.</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Partnership Tier */}
        <div className="group bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-amber-300/60 transition-all duration-300 flex items-start gap-4">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl border border-amber-100/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs text-navy-light/50 font-semibold block">Partnership Tier</span>
            <span className="text-lg font-extrabold text-navy block mt-0.5">{agentLevel}</span>
            <span className="text-[10px] text-amber-700 font-bold mt-1.5 inline-block bg-amber-50/70 border border-amber-100 px-2.5 py-0.5 rounded-lg">Rate: {commissionPercentage}</span>
          </div>
        </div>

        {/* Total Clients */}
        <div className="group bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-indigo-300/60 transition-all duration-300 flex items-start gap-4">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl border border-indigo-100/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs text-navy-light/50 font-semibold block">Total Clients</span>
            <span className="text-lg font-extrabold text-navy block mt-0.5">{totalClientsCount} Users</span>
            <span className="text-[10px] text-indigo-700 font-bold mt-1.5 inline-block bg-indigo-50/70 border border-indigo-100 px-2.5 py-0.5 rounded-lg">{activeClientsCount} Active</span>
          </div>
        </div>

        {/* Investment Volume */}
        <div className="group bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300/60 transition-all duration-300 flex items-start gap-4">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl border border-emerald-100/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-xs text-navy-light/50 font-semibold block">Investment Volume</span>
            <span className="text-lg font-extrabold text-navy block mt-0.5">{formattedInvestmentVolume}</span>
            <span className="text-[10px] text-emerald-700 font-bold mt-1.5 inline-block bg-emerald-50/70 border border-emerald-100 px-2.5 py-0.5 rounded-lg">USD Portfolio</span>
          </div>
        </div>

        {/* Available Commission */}
        <div className="group bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-sky-300/60 transition-all duration-300 flex items-start gap-4">
          <div className="bg-sky-50 text-sky-600 p-3 rounded-xl border border-sky-100/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <Wallet size={20} />
          </div>
          <div>
            <span className="text-xs text-navy-light/50 font-semibold block">Available Commission</span>
            <span className="text-lg font-extrabold text-navy block mt-0.5">{formattedCommissionBalance}</span>
            <span className="text-[10px] text-sky-700 font-bold mt-1.5 inline-block bg-sky-50/70 border border-sky-100 px-2.5 py-0.5 rounded-lg">Withdrawal Eligible</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-navy via-navy-light to-blue-900">Performance Analytics</h3>
                <p className="text-xs text-navy-light/50">Growth ledger updated as of today</p>
              </div>
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setChartTab("investment")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${chartTab === "investment" ? "bg-white text-navy shadow-sm" : "text-navy-light/60 hover:text-navy"}`}
                >
                  Investment Volume
                </button>
                <button
                  onClick={() => setChartTab("commission")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${chartTab === "commission" ? "bg-white text-navy shadow-sm" : "text-navy-light/60 hover:text-navy"}`}
                >
                  Commissions Yield
                </button>
              </div>
            </div>

            {/* Chart plot */}
            <div className="relative h-56 w-full mt-4">
              <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="chartGradNavy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B234A" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0B234A" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartGradSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284C7" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="40" y1="40" x2="560" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="100" x2="560" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="40" y1="160" x2="560" y2="160" stroke="#e2e8f0" strokeWidth="1.5" />

                <path d={areaPath} fill={chartTab === "investment" ? "url(#chartGradNavy)" : "url(#chartGradSky)"} className="transition-all duration-500 ease-in-out" />
                <path d={linePath} fill="none" stroke={chartTab === "investment" ? "#0B234A" : "#0284C7"} strokeWidth="2.5" strokeLinecap="round" className="transition-all duration-500 ease-in-out" />

                {hoveredChartIdx !== null && (
                  <line x1={points[hoveredChartIdx].x} y1="20" x2={points[hoveredChartIdx].x} y2="160" stroke={chartTab === "investment" ? "#0B234A" : "#0284C7"} strokeWidth="1.5" strokeDasharray="4 4" className="opacity-40" />
                )}

                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r={hoveredChartIdx === idx ? "7" : "5"} fill="#FFFFFF" stroke={chartTab === "investment" ? "#0B234A" : "#0284C7"} strokeWidth="3" className="transition-all duration-150 cursor-pointer shadow-md" />
                    <rect x={p.x - 30} y="10" width="60" height="170" fill="transparent" className="cursor-pointer" onMouseEnter={() => setHoveredChartIdx(idx)} onMouseLeave={() => setHoveredChartIdx(null)} />
                  </g>
                ))}

                {points.map((p, idx) => (
                  <text key={idx} x={p.x} y="185" textAnchor="middle" className="text-[10px] font-bold fill-navy-light/60 font-sans">{p.month}</text>
                ))}
              </svg>

              {hoveredChartIdx !== null && (
                <div
                  className="absolute bg-navy text-white px-3 py-2 rounded-xl shadow-lg border border-navy-light/20 flex flex-col pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-150 text-[10px] font-semibold"
                  style={{
                    left: `${(points[hoveredChartIdx].x / 600) * 100}%`,
                    top: `${(points[hoveredChartIdx].y / 200) * 100 - 8}%`
                  }}
                >
                  <span className="text-[9px] text-white/50 block font-normal">{points[hoveredChartIdx].month} 2026</span>
                  <span className="text-xs font-bold mt-0.5">
                    {chartTab === "investment" ? "$" + points[hoveredChartIdx].val.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "$" + points[hoveredChartIdx].val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Referred Clients Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-navy via-navy-light to-blue-900 flex items-center gap-2">
                  <Users size={16} className="text-navy" />
                  <span>Recent Clients</span>
                </h3>
                <p className="text-xs text-navy-light/50 font-normal">A quick snapshot of investors you referred or manage</p>
              </div>
              <Link
                href="/dashboard/clients"
                className="text-xs font-bold text-navy hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Directory</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {clientsLoading ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Loader2 className="animate-spin text-navy/40" size={24} />
                <span className="text-xs text-slate-400 font-semibold">Loading client records...</span>
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Users size={32} className="mx-auto text-slate-300 mb-2 opacity-50" />
                <p className="text-xs font-bold text-navy">No clients yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Share your referral code, or wait for an admin to assign you a client.</p>
                <Link
                  href="/dashboard/clients"
                  className="mt-3 inline-flex items-center gap-1 bg-navy hover:bg-navy-light text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition shadow-sm animate-bounce"
                >
                  <Plus size={10} />
                  <span>Add Client</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-navy-light/40 uppercase tracking-wider">
                      <th className="pb-3 pl-1">Client</th>
                      <th className="pb-3 text-center">KYC Status</th>
                      <th className="pb-3 text-right">Portfolio Value</th>
                      <th className="pb-3 text-right pr-1">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-navy">
                    {clients.map((c) => {
                      const fullClientName = c.fullName || `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "";
                      const portfolioVal = new Intl.NumberFormat('en-US', { style: 'currency', currency: c.preferredCurrency || "USD", maximumFractionDigits: 0 }).format(c.portfolioValue || 0);

                      const getKycBadge = (status?: string) => {
                        const s = String(status).toLowerCase();
                        if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-100";
                        if (s === "rejected") return "bg-rose-50 text-rose-700 border-rose-100";
                        if (s === "under_review") return "bg-amber-50 text-amber-700 border-amber-100";
                        return "bg-slate-100 text-slate-600 border-slate-200";
                      };

                      return (
                        <tr key={c._id} className="hover:bg-slate-50/50 group transition duration-150">
                          <td className="py-3 pl-1 flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-navy/5 text-navy font-bold text-[10px] flex items-center justify-center shrink-0 border border-navy/10 group-hover:scale-105 transition-transform uppercase">
                              {fullClientName.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-navy truncate max-w-[120px]">{fullClientName}</span>
                              <span className="block text-[9px] text-navy-light/40 truncate max-w-[120px] font-mono leading-none mt-0.5">{c.email}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${getKycBadge(c.kycStatus)}`}>
                              {String(c.kycStatus || "Pending").replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-navy">
                            {portfolioVal}
                          </td>
                          <td className="py-3 text-right pr-1">
                            <Link
                              href={`/dashboard/clients/${c._id}`}
                              className="inline-flex items-center justify-center h-6 w-6 rounded-lg text-slate-400 hover:text-navy hover:bg-navy/5 border border-transparent hover:border-navy/10 cursor-pointer transition"
                              title="View Details"
                            >
                              <ChevronRight size={14} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Referral Agents Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-navy via-navy-light to-blue-900 flex items-center gap-2">
                  <GitBranch size={16} className="text-navy" />
                  <span>Recent Agents</span>
                </h3>
                <p className="text-xs text-navy-light/50 font-normal">Agents you introduced to your referral network</p>
              </div>
              <Link
                href="/dashboard/agent"
                className="text-xs font-bold text-navy hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Network</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {agentsLoading ? (
              <div className="flex flex-col items-center py-12 gap-2">
                <Loader2 className="animate-spin text-navy/40" size={24} />
                <span className="text-xs text-slate-400 font-semibold">Loading agent records...</span>
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <GitBranch size={32} className="mx-auto text-slate-300 mb-2 opacity-50" />
                <p className="text-xs font-bold text-navy">No referral agents yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Create an agent account to start building your referral network.</p>
                <Link
                  href="/dashboard/agent"
                  className="mt-3 inline-flex items-center gap-1 bg-navy hover:bg-navy-light text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition shadow-sm animate-bounce"
                >
                  <UserPlus size={10} />
                  <span>Create Agent</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-navy-light/40 uppercase tracking-wider">
                      <th className="pb-3 pl-1">Agent</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-right">Clients</th>
                      <th className="pb-3 text-right pr-1">Referred On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-navy">
                    {agents.map((a) => {
                      const fullAgentName = a.fullName || `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.email || "";

                      const getStatusBadge = (status?: string) => {
                        const s = String(status).toLowerCase();
                        if (s === "active") return "bg-emerald-50 text-emerald-700 border-emerald-100";
                        if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
                        return "bg-rose-50 text-rose-700 border-rose-100";
                      };

                      return (
                        <tr key={a._id} className="hover:bg-slate-50/50 group transition duration-150">
                          <td className="py-3 pl-1 flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-navy/5 text-navy font-bold text-[10px] flex items-center justify-center shrink-0 border border-navy/10 group-hover:scale-105 transition-transform uppercase">
                              {fullAgentName.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <span className="block font-bold text-navy truncate max-w-[120px]">{fullAgentName}</span>
                              <span className="block text-[9px] text-navy-light/40 truncate max-w-[120px] font-mono leading-none mt-0.5">{a.email}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${getStatusBadge(a.status)}`}>
                              {a.status || "—"}
                            </span>
                          </td>
                          <td className="py-3 text-right font-bold text-navy">
                            {a.totalClients ?? 0}
                            <span className="text-slate-400 font-normal"> ({a.activeClients ?? 0} active)</span>
                          </td>
                          <td className="py-3 text-right pr-1 text-slate-500 font-normal">
                            {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          {/* Partner Identity */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-navy via-navy-light to-blue-900 border-b border-slate-100 pb-3 mb-4">Partner Identity</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-50 text-navy-light/60 border border-slate-200/80 rounded-lg flex items-center justify-center shrink-0">
                  <User size={15} />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Full Name</span>
                  <span className="text-xs font-bold text-navy leading-none mt-0.5 block">{fullName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-50 text-navy-light/60 border border-slate-200/80 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={15} />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Email Address</span>
                  <span className="text-xs font-bold text-navy leading-none mt-0.5 block truncate max-w-[180px]">{user?.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-50 text-navy-light/60 border border-slate-200/80 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck size={15} />
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Compliance Status</span>
                  <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    KYC Approved
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-slate-50 text-navy-light/60 border border-slate-200/80 rounded-lg flex items-center justify-center shrink-0">
                  <Layers size={15} />
                </div>
                <div className="flex-1 col-span-1">
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Referral Code</span>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs font-bold text-navy font-mono">{user?.referralCode || "N/A"}</span>
                    {user?.referralCode && (
                      <button
                        onClick={copyReferralCode}
                        className="text-navy-light/60 hover:text-navy hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedCode ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Rules & Eligibility */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-bold font-heading text-transparent bg-clip-text bg-gradient-to-r from-navy via-navy-light to-blue-900 border-b border-slate-100 pb-3 mb-4">Rules & Salary Status</h3>
            
            <div className="space-y-4">
              {/* Salary Activation Status */}
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${user?.salaryActivated ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-navy-light/60 border border-slate-200/80"}`}>
                  <Award size={15} />
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Salary Activation</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-navy">
                      {user?.salaryActivated ? "Activated" : "Not Activated"}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${user?.salaryActivated ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {user?.salaryActivated ? "Lifetime Active" : "Requires 2 Lifetime Sales"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monthly Eligibility */}
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${user?.isSalaryEligibleThisMonth ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"}`}>
                  <Activity size={15} />
                </div>
                <div className="flex-1">
                  <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider">Salary Eligibility (This Month)</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-navy">
                      {user?.isSalaryEligibleThisMonth ? "Eligible" : "Not Eligible"}
                    </span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${user?.isSalaryEligibleThisMonth ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {user?.salesThisMonth || 0} / 2 Sales
                    </span>
                  </div>
                  <p className="text-[10px] text-navy-light/50 font-light mt-1">
                    Min. 2 sales required each month to qualify for salary.
                  </p>
                </div>
              </div>

              {/* Tier Rules */}
              <div className="border-t border-slate-100 pt-3 mt-3">
                <span className="block text-[9px] uppercase font-bold text-navy/40 tracking-wider mb-2">Commission Tiers (SIP)</span>
                <p className="text-[10px] text-navy-light/50 font-light mb-2">
                  Rate is set by the amount of each individual SIP sale.
                </p>
                <div className="space-y-1.5 text-[11px] font-semibold text-navy">
                  {SIP_COMMISSION_TIERS.map((tier) => (
                    <div
                      key={tier.level}
                      className={`flex items-center justify-between p-1.5 rounded-lg ${user?.agentLevel === tier.level ? "bg-navy/5 font-bold" : "text-navy-light/60 font-normal"}`}
                    >
                      <span>{tier.label} ({tierRangeLabel(tier)})</span>
                      <span>{tier.rate}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
