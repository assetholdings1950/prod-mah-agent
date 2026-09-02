"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search, RefreshCw, Layers, CheckCircle2, Check, ArrowRight, X, Info,
  TrendingUp, Bitcoin, CalendarClock, Wallet2, ShieldCheck, Scale
} from "lucide-react";
import { api } from "../../../utils/api";
import { toastError } from "../../../utils/toast-message/taost-message";
import type { InvestmentPlan } from "@/types";

// Rich-text admin content ships as HTML (`shortDescription`); this surface only
// ever shows a plain-text preview, so tags are stripped rather than rendered.
const stripHtml = (html?: string) =>
  (html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const CATEGORY_META: Record<string, { icon: typeof TrendingUp; label: string }> = {
  crypto: { icon: Bitcoin, label: "Crypto" },
  monthly: { icon: CalendarClock, label: "Monthly" },
  lumpsum: { icon: Wallet2, label: "Lumpsum" },
};

const getCategoryMeta = (category: string) =>
  CATEGORY_META[category.toLowerCase()] ?? { icon: Layers, label: category };

const getRiskStyles = (level?: string) => {
  const lvl = String(level).toLowerCase().replace("_", " ");
  if (lvl.includes("low")) {
    return { bg: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500", bar: "from-emerald-400 to-emerald-500", text: "Low Risk" };
  }
  if (lvl.includes("medium")) {
    return { bg: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500", bar: "from-amber-400 to-amber-500", text: "Medium Risk" };
  }
  if (lvl.includes("very high")) {
    return { bg: "bg-rose-50 text-rose-700 border-rose-100", dot: "bg-rose-500", bar: "from-rose-400 to-rose-500", text: "Very High Risk" };
  }
  if (lvl.includes("high")) {
    return { bg: "bg-red-50 text-red-700 border-red-100", dot: "bg-red-500", bar: "from-red-400 to-red-500", text: "High Risk" };
  }
  return { bg: "bg-slate-50 text-slate-700 border-slate-100", dot: "bg-slate-500", bar: "from-slate-400 to-slate-500", text: "Conservative" };
};

const fmtCurrency = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

const CATEGORY_TABS = ["All", "Monthly", "Lumpsum", "Crypto"];
const MAX_COMPARE = 3;

export default function ComparePlansPage() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Plan Selection for comparison
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all active plans (standard limit 50 is fine)
      const res = await api.getInvestmentPlans({ limit: 50, status: "active" });
      if (res && res.status && res.plans?.docs) {
        setPlans(res.plans.docs);
      } else {
        toastError("Failed to fetch investment plans.");
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      toastError("Network error. Failed to retrieve portfolios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSelectPlan = (id: string) => {
    if (selectedPlanIds.includes(id)) {
      setSelectedPlanIds((prev) => prev.filter((pId) => pId !== id));
    } else {
      if (selectedPlanIds.length >= MAX_COMPARE) {
        toastError("Comparison Limit Reached", { description: `You can compare up to ${MAX_COMPARE} plans side by side.` });
        return;
      }
      setSelectedPlanIds((prev) => [...prev, id]);
    }
  };

  // Filter plans based on search & category
  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stripHtml(p.shortDescription).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "All" || p.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const selectedPlansList = plans.filter((p) => selectedPlanIds.includes(p._id));

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    plans.forEach((p) => {
      const key = p.category.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [plans]);

  return (
    <div className="space-y-6 animate-fade-in relative min-h-[80vh] pb-28">
      {/* ══ Header ══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-navy">Commercial Plans</h1>
          <p className="text-xs text-navy-light/50">Search and compare wealth portfolios to present to prospective investors.</p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-center shadow-sm">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Live Plans</span>
            <span className="block text-sm font-extrabold text-navy">{plans.length}</span>
          </div>
          <button
            onClick={fetchPlans}
            className="rounded-xl border border-slate-200 bg-white p-2.5 transition duration-150 hover:bg-slate-50 cursor-pointer"
            title="Refresh Portfolios"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ══ Search & Filters Toolbar ══ */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search portfolios by name or overview..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200/80 bg-slate-50 py-2.5 pl-10 pr-4 text-xs text-navy placeholder-slate-400 transition duration-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-navy/5"
          />
        </div>

        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1 self-start sm:self-center">
          {CATEGORY_TABS.map((cat) => {
            const active = categoryFilter === cat;
            const count = cat === "All" ? plans.length : categoryCounts[cat.toLowerCase()] || 0;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition duration-150 cursor-pointer ${
                  active
                    ? "bg-navy text-white shadow-sm"
                    : "text-navy-light/60 hover:text-navy hover:bg-white/60"
                }`}
              >
                {cat}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${active ? "bg-white/15 text-white" : "bg-slate-200/70 text-slate-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Plans Banner Info */}
      {selectedPlanIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-[11px] font-semibold text-sky-800 shadow-sm">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600">
            <Scale size={13} />
          </div>
          <span>
            <strong>{selectedPlanIds.length}</strong> of {MAX_COMPARE} plans selected for comparison
            {selectedPlanIds.length < 2 ? " — select at least 2 to run the side-by-side matrix." : "."}
          </span>
        </div>
      )}

      {/* ══ Plans Grid ══ */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <RefreshCw size={26} className="animate-spin text-navy/40" />
          <span className="text-sm font-semibold text-slate-400">Syncing investment plans from vault...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.length > 0 ? (
            filteredPlans.map((plan) => {
              const isSelected = selectedPlanIds.includes(plan._id);
              const risk = getRiskStyles(plan.riskLevel);
              const category = getCategoryMeta(plan.category);
              const CategoryIcon = category.icon;
              const formattedRoi = plan.roiType === "fixed"
                ? `${plan.roiMin ?? 0}%`
                : `${plan.roiMin ?? 0}–${plan.roiMax ?? 0}%`;
              const description = stripHtml(plan.shortDescription) || "No overview description provided for this portfolio.";

              return (
                <div
                  key={plan._id}
                  onClick={() => handleSelectPlan(plan._id)}
                  className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isSelected ? "border-navy shadow-lg shadow-navy/10 ring-4 ring-navy/5" : "border-slate-200/80 shadow-sm"
                  }`}
                >
                  {/* Risk-tinted accent bar */}
                  <div className={`h-1 w-full bg-gradient-to-r ${risk.bar}`} />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Header */}
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-navy/10 bg-navy/5 text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                          <CategoryIcon size={17} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.label}</span>
                          <h3 className="mt-0.5 truncate font-heading text-base font-semibold text-navy leading-snug">
                            {plan.name}
                          </h3>
                        </div>
                      </div>

                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                        isSelected ? "scale-110 border-navy bg-navy text-white" : "border-slate-300 group-hover:border-navy/40"
                      }`}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-4 line-clamp-2 text-xs font-light leading-relaxed text-navy-light/60">
                      {description}
                    </p>

                    {/* Metrics block */}
                    <div className="mt-auto grid grid-cols-2 gap-x-4 gap-y-3.5 border-t border-slate-100 pt-4 text-[11px] font-semibold text-navy">
                      <div>
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <TrendingUp size={10} /> Est. Return
                        </span>
                        <span className="mt-0.5 block text-sm font-extrabold text-emerald-600">{formattedRoi} <span className="text-[10px] font-bold text-slate-400">p.a.</span></span>
                      </div>

                      <div>
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <ShieldCheck size={10} /> Risk Level
                        </span>
                        <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${risk.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`}></span>
                          {risk.text}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Min Capital</span>
                        <span className="mt-0.5 block text-xs font-extrabold text-navy">
                          {plan.category === "crypto"
                            ? "Flexible"
                            : fmtCurrency(plan.minAmount || 0, plan.currency || "USD")}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payout Mode</span>
                        <span className="mt-0.5 block text-xs font-bold capitalize text-navy">{plan.payoutType || "Lumpsum"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
              <Layers size={30} className="text-slate-300" />
              <p className="text-sm font-bold text-navy">No portfolios match your filters</p>
              <p className="text-xs font-light text-slate-400">Try a different search term or category.</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Compare Action Bar */}
      {selectedPlanIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-lg -translate-x-1/2 rounded-2xl border border-white/10 bg-navy px-5 py-4 shadow-2xl shadow-navy/30 animate-slide-in-right">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-blue-300">
                <Scale size={16} />
              </div>
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-blue-300">Comparison Grid Ready</span>
                <span className="text-xs font-bold text-white">{selectedPlanIds.length} portfolios selected</span>
              </div>
            </div>

            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-navy shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 cursor-pointer"
            >
              <span>Compare Now</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMPARE MATRIX MODAL
          ========================================================================= */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/60 p-3 font-sans backdrop-blur-sm animate-fade-in sm:p-4">
          <div className="flex min-h-full items-start justify-center pt-10 pb-4 sm:pt-16 sm:pb-8">
            <div className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in sm:max-h-[calc(100vh-8rem)] sm:rounded-3xl">

              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <h3 className="text-base font-bold font-heading text-navy sm:text-lg">Side-by-Side Comparison</h3>
                  <p className="text-[11px] text-navy-light/50">Evaluate returns, risk, and payout parameters at a glance.</p>
                </div>
                <button
                  onClick={() => setIsCompareModalOpen(false)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-navy cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Matrix — stacked cards on mobile, table from sm: up */}
              <div className="overflow-auto">

                {/* Mobile: one card per plan */}
                <div className="flex flex-col divide-y divide-slate-100 sm:hidden">
                  {selectedPlansList.map((p) => {
                    const category = getCategoryMeta(p.category);
                    const CategoryIcon = category.icon;
                    const risk = getRiskStyles(p.riskLevel);
                    return (
                      <div key={p._id} className="p-4 space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
                            <CategoryIcon size={17} />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">{category.label}</span>
                            <h4 className="truncate font-heading text-base font-semibold text-navy">{p.name}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Expected Return</span>
                            <span className="mt-0.5 block text-sm font-extrabold text-emerald-600">
                              {p.roiType === "fixed" ? `${p.roiMin ?? 0}%` : `${p.roiMin ?? 0}–${p.roiMax ?? 0}%`} <span className="text-[10px] font-bold text-slate-400">p.a.</span>
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Risk Rating</span>
                            <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${risk.bg}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                              {risk.text}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Min Investment</span>
                            <span className="mt-0.5 block text-sm font-extrabold text-navy">
                              {p.category === "crypto" ? "Flexible" : fmtCurrency(p.minAmount || 0, p.currency || "USD")}
                            </span>
                          </div>
                          <div className="rounded-xl bg-slate-50 p-3">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Payout Schedule</span>
                            <span className="mt-0.5 block text-sm font-bold capitalize text-navy">{p.payoutType || "Lumpsum"}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Portfolio Overview</span>
                          <p className="text-[12px] font-light leading-relaxed text-navy-light/75">
                            {stripHtml(p.shortDescription) || "No summary overview provided."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* sm: and up — full comparison table */}
                <table className="hidden w-full table-fixed border-collapse text-left text-xs font-semibold text-navy sm:table">
                <thead>
                  <tr>
                    <th className="w-[150px] border-b border-slate-100 bg-slate-50 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-400 sticky left-0 z-10">
                      Attributes
                    </th>
                    {selectedPlansList.map((p) => {
                      const category = getCategoryMeta(p.category);
                      const CategoryIcon = category.icon;
                      return (
                        <th key={p._id} className="border-b border-l border-slate-100 bg-slate-50 py-4 px-5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy/5 text-navy">
                              <CategoryIcon size={13} />
                            </div>
                            <span className="truncate font-heading text-sm font-semibold uppercase tracking-wide text-navy">{p.name}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Category */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Category</td>
                    {selectedPlansList.map((p) => (
                      <td key={p._id} className="border-l border-slate-100 py-4 px-5 font-bold capitalize text-navy-light">
                        {p.category}
                      </td>
                    ))}
                  </tr>

                  {/* ROI */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Expected Return</td>
                    {selectedPlansList.map((p) => (
                      <td key={p._id} className="border-l border-slate-100 py-4 px-5 text-sm font-extrabold text-emerald-600">
                        {p.roiType === "fixed" ? `${p.roiMin ?? 0}%` : `${p.roiMin ?? 0}–${p.roiMax ?? 0}%`} <span className="text-[10px] font-bold text-slate-400">p.a.</span>
                      </td>
                    ))}
                  </tr>

                  {/* Risk Level */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Risk Rating</td>
                    {selectedPlansList.map((p) => {
                      const risk = getRiskStyles(p.riskLevel);
                      return (
                        <td key={p._id} className="border-l border-slate-100 py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${risk.bg}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${risk.dot}`} />
                            {risk.text}
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Min Amount */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Min Investment</td>
                    {selectedPlansList.map((p) => (
                      <td key={p._id} className="border-l border-slate-100 py-4 px-5 font-extrabold">
                        {p.category === "crypto" ? "Flexible" : fmtCurrency(p.minAmount || 0, p.currency || "USD")}
                      </td>
                    ))}
                  </tr>

                  {/* Payout Type */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Payout Schedule</td>
                    {selectedPlansList.map((p) => (
                      <td key={p._id} className="border-l border-slate-100 py-4 px-5 capitalize">
                        {p.payoutType || "Lumpsum"}
                      </td>
                    ))}
                  </tr>

                  {/* Short description */}
                  <tr>
                    <td className="sticky left-0 z-10 bg-slate-50/60 py-4 px-5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Portfolio Overview</td>
                    {selectedPlansList.map((p) => (
                      <td key={p._id} className="border-l border-slate-100 py-4 px-5 text-[11px] font-light leading-relaxed text-navy-light/75">
                        {stripHtml(p.shortDescription) || "No summary overview provided."}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                <Info size={12} className="shrink-0" /> Figures shown are indicative and sourced from live plan data.
              </span>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-navy px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-navy-light cursor-pointer"
              >
                <CheckCircle2 size={13} />
                Close Comparison
              </button>
            </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
