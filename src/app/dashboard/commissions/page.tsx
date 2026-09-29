"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Download, Filter, Loader2, ReceiptText, Search, X } from "lucide-react";
import { api } from "../../../utils/api";
import { useAgent } from "../../../components/AgentContext";
import { toastError } from "../../../utils/toast-message/taost-message";
import type { CommissionTransaction } from "@/types";

type LedgerData = {
  docs: CommissionTransaction[];
  page: number;
  limit: number;
  totalDocs: number;
  totalPages: number;
  totals: { credited: number; pending: number };
};

const money = (value?: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2,
}).format(Number(value || 0));

const dateTime = (value?: string) => value
  ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const clientName = (record: CommissionTransaction) =>
  record.client?.fullName || [record.client?.firstName, record.client?.lastName].filter(Boolean).join(" ") || "Client unavailable";

export default function CommissionTransactionsPage() {
  const { availableCommission } = useAgent();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);

  const filters = useMemo(() => ({
    page: Math.max(1, Number(searchParams.get("page") || 1)),
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || "all",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    selected: searchParams.get("selected") || "",
  }), [searchParams]);

  const updateUrl = useCallback((changes: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(searchParams.toString());
    if (resetPage) next.delete("page");
    Object.entries(changes).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") next.delete(key);
      else next.set(key, String(value));
    });
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getMyCommissionTransactions({
        page: filters.page,
        limit: 20,
        search: filters.search || undefined,
        status: filters.status,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (response?.status && response.data) setLedger(response.data as LedgerData);
      else toastError(response?.message || "Unable to load commission transactions.");
    } catch (error) {
      console.error("Unable to load commission ledger:", error);
      toastError("Unable to connect to the commission ledger.");
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.page, filters.search, filters.status]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  const selectedRecord = ledger?.docs.find((record) => record._id === filters.selected) || null;

  const exportCsv = async () => {
    try {
      const response = await api.getMyCommissionTransactions({
        page: 1, limit: 100,
        search: filters.search || undefined, status: filters.status,
        dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined,
      });
      const rows = (response?.data?.docs || []) as CommissionTransaction[];
      if (!rows.length) return toastError("There are no matching commission records to export.");
      const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const csv = [
        ["Credited at", "Commission (USD)", "Status", "Client", "Client email", "Investment value (USD)", "Rate", "Policy", "Investment transaction ID", "Commission transaction ID"],
        ...rows.map((row) => [
          row.createdAt, Number(row.amount || 0).toFixed(2), row.status, clientName(row), row.client?.email || "",
          Number(row.metadata?.commissionBaseUsd || 0).toFixed(2), `${row.metadata?.commissionRate ?? 0}%`,
          row.metadata?.commissionPolicyName || "", row.referenceId || "", row._id,
        ]),
      ].map((row) => row.map(escape).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "merlion-commission-ledger.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Unable to export commission ledger:", error);
      toastError("Unable to export the commission ledger.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-navy">Commission Transactions</h1>
          <p className="text-xs text-navy-light/50">Every commission credited to you, linked to the completed client investment that created it.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/payouts" className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-navy shadow-sm hover:bg-slate-50">Payout settlements</Link>
          <button onClick={exportCsv} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-navy px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-navy-light"><Download size={14} /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Summary label="Available to withdraw" value={money(availableCommission)} accent="text-emerald-600" />
        <Summary label="Credited in this view" value={money(ledger?.totals?.credited)} />
        <Summary label="Pending in this view" value={money(ledger?.totals?.pending)} accent="text-amber-600" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} /><input value={filters.search} onChange={(event) => updateUrl({ search: event.target.value })} placeholder="Search client, email, or description" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs font-medium text-navy outline-none focus:border-navy/40 focus:bg-white" /></label>
          <label className="relative"><Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><select value={filters.status} onChange={(event) => updateUrl({ status: event.target.value })} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3 text-xs font-bold text-navy outline-none"><option value="all">All statuses</option><option value="completed">Credited</option><option value="pending">Pending</option><option value="failed">Failed</option></select></label>
          <label className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input aria-label="From date" type="date" value={filters.dateFrom} onChange={(event) => updateUrl({ dateFrom: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-2 text-xs font-medium text-navy outline-none" /></label>
          <label className="relative"><CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input aria-label="To date" type="date" value={filters.dateTo} onChange={(event) => updateUrl({ dateTo: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-2 text-xs font-medium text-navy outline-none" /></label>
        </div>
        {(filters.search || filters.status !== "all" || filters.dateFrom || filters.dateTo) && <button onClick={() => updateUrl({ search: null, status: null, dateFrom: null, dateTo: null, selected: null })} className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-navy-light/65 hover:text-navy"><X size={13} /> Clear filters</button>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3.5">Credited</th><th className="px-5 py-3.5">Client & source</th><th className="px-5 py-3.5">Investment</th><th className="px-5 py-3.5">Rate / policy</th><th className="px-5 py-3.5">Commission</th><th className="px-5 py-3.5">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={6} className="px-5 py-14 text-center"><Loader2 className="mx-auto animate-spin text-navy/45" size={20} /><span className="mt-2 block text-xs text-slate-400">Loading commission ledger…</span></td></tr>}
              {!loading && !ledger?.docs?.length && <tr><td colSpan={6} className="px-5 py-14 text-center"><ReceiptText className="mx-auto text-slate-300" size={26} /><span className="mt-2 block text-sm font-bold text-navy">No commission records found</span><span className="mt-1 block text-xs text-slate-400">Completed client investments will appear here once commission is credited.</span></td></tr>}
              {!loading && ledger?.docs.map((record) => <tr key={record._id} onClick={() => updateUrl({ selected: record._id }, false)} className="cursor-pointer transition hover:bg-slate-50/80"><td className="px-5 py-4 text-xs text-navy-light/70">{dateTime(record.createdAt)}</td><td className="px-5 py-4"><p className="text-xs font-bold text-navy">{clientName(record)}</p><p className="mt-0.5 text-[11px] text-slate-400">{record.client?.email || "Client record no longer available"}</p></td><td className="px-5 py-4"><p className="text-xs font-bold text-navy">{money(record.metadata?.commissionBaseUsd)}</p><p className="mt-0.5 font-mono text-[10px] text-slate-400">{record.referenceId ? `#${record.referenceId.slice(-8)}` : "—"}</p></td><td className="px-5 py-4"><p className="text-xs font-bold text-navy">{record.metadata?.commissionRate ?? 0}%</p><p className="mt-0.5 text-[11px] text-slate-400">{record.metadata?.commissionPolicyName || "Policy snapshot"}</p></td><td className="px-5 py-4 text-sm font-extrabold text-emerald-600">{money(record.amount)}</td><td className="px-5 py-4"><StatusBadge status={record.status} /></td></tr>)}
            </tbody>
          </table>
        </div>
        {!!ledger?.totalDocs && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5"><span className="text-xs text-slate-400">{ledger.totalDocs} commission record{ledger.totalDocs === 1 ? "" : "s"}</span><div className="flex gap-2"><button disabled={filters.page <= 1} onClick={() => updateUrl({ page: filters.page - 1 }, false)} className="rounded-lg border border-slate-200 p-1.5 text-navy disabled:cursor-not-allowed disabled:opacity-35"><ChevronLeft size={15} /></button><span className="px-1 py-1.5 text-xs font-bold text-navy">{filters.page} / {ledger.totalPages}</span><button disabled={filters.page >= ledger.totalPages} onClick={() => updateUrl({ page: filters.page + 1 }, false)} className="rounded-lg border border-slate-200 p-1.5 text-navy disabled:cursor-not-allowed disabled:opacity-35"><ChevronRight size={15} /></button></div></div>}
      </div>

      {selectedRecord && <section className="rounded-2xl border border-blue-100 bg-blue-50/45 p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Commission audit details</p><h2 className="mt-1 text-lg font-heading font-extrabold text-navy">{money(selectedRecord.amount)} credited from {clientName(selectedRecord)}</h2></div><button onClick={() => updateUrl({ selected: null }, false)} className="rounded-lg p-1.5 text-navy-light/60 hover:bg-white"><X size={17} /></button></div><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Completed investment" value={money(selectedRecord.metadata?.commissionBaseUsd)} /><Detail label="Rate captured" value={`${selectedRecord.metadata?.commissionRate ?? 0}%`} /><Detail label="Policy captured" value={selectedRecord.metadata?.commissionPolicyName || "—"} /><Detail label="Recipient" value="You — account manager" /></div><div className="mt-4 grid gap-2 text-[11px] text-navy-light/70"><p><span className="font-bold text-navy">Investment transaction:</span> {selectedRecord.referenceId || "—"}</p><p><span className="font-bold text-navy">Commission transaction:</span> {selectedRecord._id}</p>{selectedRecord.client?._id && <Link className="font-bold text-blue-600 hover:underline" href={`/dashboard/clients/${selectedRecord.client._id}`}>View client record →</Link>}</div></section>}
    </div>
  );
}

function Summary({ label, value, accent = "text-navy" }: { label: string; value: string; accent?: string }) { return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-xl font-extrabold ${accent}`}>{value}</p></div>; }
function Detail({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-blue-100 bg-white/80 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-navy">{value}</p></div>; }
function StatusBadge({ status }: { status: string }) { const completed = status === "completed"; const pending = status === "pending"; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${completed ? "border-emerald-100 bg-emerald-50 text-emerald-700" : pending ? "border-amber-100 bg-amber-50 text-amber-700" : "border-rose-100 bg-rose-50 text-rose-700"}`}>{completed ? "Credited" : status}</span>; }
