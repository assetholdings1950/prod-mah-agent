"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp, Users, Layers, Wallet, LogOut, Copy, Check, Menu, X, Award, ShieldCheck, Mail, ChevronRight, Activity, User, Settings, ChevronDown, GitBranch
} from "lucide-react";
import { api, apiFetch, getTokens, setCurrentUser } from "../../utils/api";
import { AgentContext } from "../../components/AgentContext";
import { toastSuccess, toastError } from "../../utils/toast-message/taost-message";
import type { Agent } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<Agent | null>(null);
  const [availableCommission, setAvailableCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const desktopProfileRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside (desktop & mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const insideDesktop = desktopProfileRef.current?.contains(target);
      const insideMobile = mobileProfileRef.current?.contains(target);
      if (!insideDesktop && !insideMobile) {
        setProfileMenuOpen(false);
      }
    };

    if (profileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [profileMenuOpen]);

  // Close dropdown on route change
  useEffect(() => {
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await apiFetch<{ data?: Agent; agent?: Agent }>("/agent/profile");
      if (res && res.status) {
        const profile = res.data || res.agent || null;
        setUser(profile);
        setCurrentUser(profile); // update memory cache
        if (profile && profile.availableCommissionBalance !== undefined) {
          setAvailableCommission(profile.availableCommissionBalance);
        }

        // KYC Verification check
        if (profile && profile.kycStatus !== "approved") {
          router.push("/kyc-verification");
          return;
        }
      } else {
        // Fallback or retry
        toastError("Failed to fetch fresh profile.");
      }
    } catch (err) {
      console.error("Error fetching fresh profile:", err);
      toastError("Failed to connect to agent profile service.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const { accessToken } = getTokens();
    if (!accessToken) {
      router.push("/login?message=session_expired");
      return;
    }
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    await api.logout();
  };

  const copyReferralCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopiedCode(true);
      toastSuccess("Referral Code Copied", { description: "You can share this code to refer clients." });
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent"></div>
          <span className="text-sm font-medium text-navy/80">Securing Session...</span>
        </div>
      </div>
    );
  }

  const fullName = user?.fullName || `${user?.firstName || "Agent"} ${user?.lastName || ""}`.trim();
  const agentLevel = user?.agentLevel ? (user.agentLevel.charAt(0).toUpperCase() + user.agentLevel.slice(1) + " Partner") : "Basic Partner";

  // Tier color mapper
  const getTierColor = (level?: string) => {
    const lvl = String(level).toLowerCase();
    if (lvl.includes("diamond")) return "from-indigo-600 to-blue-700 text-white border-indigo-200/20";
    if (lvl.includes("gold")) return "from-amber-500 to-amber-600 text-white border-amber-200/20";
    if (lvl.includes("silver")) return "from-slate-400 to-slate-500 text-white border-slate-200/20";
    return "from-slate-600 to-slate-700 text-white border-slate-200/20";
  };

  const menuItems = [
    { name: "Dashboard Overview", href: "/dashboard", icon: TrendingUp },
    { name: "Referred Clients", href: "/dashboard/clients", icon: Users },
    { name: "Referral Agents", href: "/dashboard/agent", icon: GitBranch },
    { name: "Compare Plans", href: "/dashboard/compare", icon: Layers },
    { name: "Payout Settlements", href: "/dashboard/payouts", icon: Wallet },
    { name: "My Profile", href: "/dashboard/profile", icon: User },
  ];

  return (
    <AgentContext.Provider value={{ user, setUser, availableCommission, setAvailableCommission, refreshProfile: fetchProfile }}>
      <div className="h-screen flex bg-slate-50/50 text-navy font-sans relative overflow-hidden">

        {/* Decorative ambient background blobs */}
        <div className="absolute top-[-10%] left-[-5%] w-[45vw] h-[45vw] bg-navy/[0.015] rounded-full blur-[130px] pointer-events-none -z-10 animate-float-slow"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] bg-blue-500/[0.012] rounded-full blur-[130px] pointer-events-none -z-10 animate-float-slower"></div>

        {/* =========================================================================
            DESKTOP SIDEBAR
            ========================================================================= */}
        <aside className="hidden lg:flex flex-col w-64 bg-navy text-white shrink-0 border-r border-navy-light/10 relative z-30 shadow-xl shadow-navy/10">
          {/* Background image overlay with luxury feel */}
          <div
            className="absolute inset-0 opacity-[0.03] bg-cover bg-center pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1565967511849-75a6fd7f9382?auto=format&fit=crop&w=400&q=50')" }}
          />

          {/* Sidebar Brand Header */}
          <div className="p-3.5 border-b border-white/10 relative z-10 flex flex-col items-center text-center shrink-0">
            <div className="bg-white px-3 py-1.5 rounded-2xl shadow-lg border border-white/20 flex items-center justify-center w-full max-w-[195px] mb-2 transition-all duration-300 hover:shadow-blue-500/10">
              <img
                src="/assets/MAH.jpeg"
                alt="Merlion Asset Holdings"
                className="h-8.5 w-full object-contain"
              />
            </div>
            <span className="text-xs font-bold tracking-wide text-white">Merlion Asset Holdings</span>
            <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/20 text-[9px] uppercase tracking-widest text-blue-300 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
              <span>Agent Portal</span>
            </div>
          </div>

          {/* Scrollable & Flexible Middle Area (Nav + Support Desk) */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col justify-between p-2.5 space-y-2.5 relative z-10">
            {/* Navigation Items */}
            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer group ${active
                      ? "bg-gradient-to-r from-white/15 to-white/10 text-white shadow-sm border border-white/10 font-bold"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                  >
                    <Icon
                      size={15}
                      className={`transition-colors duration-200 shrink-0 ${active ? "text-blue-300" : "text-slate-400 group-hover:text-blue-300"
                        }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {active && <ChevronRight size={12} className="ml-auto text-blue-300 shrink-0" />}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Support Desk */}
            <div className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-xl p-2.5 relative overflow-hidden transition-all duration-200 text-left shrink-0">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="p-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  <Mail size={12} />
                </div>
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Support Desk</h4>
              </div>
              <p className="text-[10px] text-slate-300/80 font-normal leading-snug mb-2">
                Assistance with KYC, commissions, or customer payouts.
              </p>
              <a
                href="mailto:admin@merlionassetholdings.com"
                className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-slate-100 text-navy font-bold text-center py-1.5 px-3 rounded-lg text-[11px] shadow-sm transition duration-200 cursor-pointer active:scale-[0.99]"
              >
                <Mail size={12} className="text-navy shrink-0" />
                <span>Email Support Office</span>
              </a>
            </div>
          </div>

          {/* Sidebar Footer / Agent Box (Pinned at bottom) */}
          <div className="p-2.5 border-t border-white/10 bg-navy-light/25 shrink-0 relative z-10 space-y-2">
            {/* Agent Info card */}
            <div className="bg-navy-light/40 border border-white/10 rounded-xl p-2 space-y-1.5 shadow-inner">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow shrink-0">
                  {user?.firstName?.charAt(0) || "A"}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white truncate leading-tight">{fullName}</span>
                  <span className="block text-[9px] text-slate-300/70 font-semibold truncate">ID: {user?.agentId || "—"}</span>
                </div>
              </div>

              {/* Tier Badge */}
              <div className={`w-full bg-gradient-to-r ${getTierColor(user?.agentLevel)} py-0.5 px-2 rounded text-center text-[9px] font-bold tracking-wider uppercase border`}>
                {agentLevel}
              </div>

              {/* Referral Code Copy */}
              <div className="flex items-center justify-between gap-1 bg-navy/70 rounded px-2 py-1 border border-white/5">
                <div className="min-w-0">
                  <span className="block text-[7px] uppercase tracking-wider text-slate-400 font-bold">Referral Code</span>
                  <span className="text-[10px] font-bold text-slate-200 font-mono tracking-wider">{user?.referralCode || "—"}</span>
                </div>
                <button
                  onClick={copyReferralCode}
                  className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 border border-white/10 hover:border-red-400/30 bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-200 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer"
            >
              <LogOut size={12} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* =========================================================================
            MOBILE NAV SYSTEM
            ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Top Header */}
          <header className="lg:hidden bg-navy text-white px-3 sm:px-4 h-16 flex items-center justify-between relative z-40 border-b border-navy-light/10 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open Navigation Menu"
                className="p-2 bg-white/10 border border-white/10 rounded-xl hover:bg-white/15 transition-colors cursor-pointer shrink-0"
              >
                <Menu size={18} />
              </button>

              <h1 className="text-sm font-bold text-white truncate uppercase tracking-wider">
                {menuItems.find(m => pathname === m.href)?.name || "Dashboard"}
              </h1>
            </div>

            <div ref={mobileProfileRef} className="relative flex items-center gap-2 shrink-0">
              {/* Live Sync Status indicator */}
              <div className="flex items-center gap-1.5 bg-white/10 border border-white/5 px-2 py-1 rounded-xl shadow-inner">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-slate-300 tracking-wider uppercase hidden xs:inline">Live</span>
              </div>

              {/* Avatar button */}
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                aria-label="Toggle user profile menu"
                className="relative h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow shrink-0 border border-white/10 cursor-pointer active:scale-95 transition-transform"
              >
                {user?.profileImage
                  ? <img src={user.profileImage} alt="" className="h-full w-full rounded-xl object-cover" />
                  : (user?.firstName?.charAt(0) || "A")}
              </button>

              {/* Mobile Profile Dropdown */}
              {profileMenuOpen && (
                <>
                  {/* Backdrop for clicking outside */}
                  <div
                    className="fixed inset-0 z-40 bg-navy/20 backdrop-blur-[1px]"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 z-50 w-60 rounded-2xl border border-slate-200/80 bg-white text-navy shadow-2xl overflow-hidden animate-scale-in">
                    {/* User chip */}
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/70">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-navy to-navy-light text-white flex items-center justify-center font-extrabold text-sm shadow shrink-0">
                        {user?.profileImage
                          ? <img src={user.profileImage} alt="" className="h-full w-full rounded-xl object-cover" />
                          : (user?.firstName?.charAt(0) || "A")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-navy truncate">{fullName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                        <span className="inline-block text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 border border-blue-100">
                          {agentLevel}
                        </span>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User size={14} className="text-slate-400" />
                        View Profile
                      </Link>
                      <a
                        href="mailto:admin@merlionassetholdings.com"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Mail size={14} className="text-slate-400" />
                        Email Support Office
                      </a>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-slate-100 py-1.5">
                      <button
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Mobile Drawer Slide-over */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              {/* Overlay Backdrop */}
              <div
                className="fixed inset-0 bg-navy/70 backdrop-blur-sm animate-fade-in"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer Content */}
              <div className="relative flex flex-col w-72 max-w-[85vw] bg-navy text-white h-[100dvh] shadow-2xl z-10 animate-slide-in-left border-r border-white/10">
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close Navigation Menu"
                  className="absolute top-3.5 right-3.5 p-1.5 bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>

                {/* Header */}
                <div className="p-5 border-b border-white/10 flex flex-col items-center text-center shrink-0">
                  <div className="bg-white px-3 py-2 rounded-2xl shadow-md border border-white/20 flex items-center justify-center w-full max-w-[190px] mb-2.5">
                    <img
                      src="/assets/MAH.jpeg"
                      alt="Merlion Asset Holdings"
                      className="h-10 w-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-bold tracking-wide text-white">Merlion Asset Holdings</span>
                  <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-400/20 text-[9px] uppercase tracking-widest text-blue-300 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                    <span>Agent Portal</span>
                  </div>
                </div>

                {/* Scrollable Nav & Support */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-4 flex flex-col justify-between">
                  <nav className="space-y-1">
                    {menuItems.map((item) => {
                      const active = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${active
                            ? "bg-gradient-to-r from-white/15 to-white/10 text-white font-bold border border-white/10 shadow-sm"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                            }`}
                        >
                          <Icon size={16} className={active ? "text-blue-300" : "text-slate-400"} />
                          <span>{item.name}</span>
                          {active && <ChevronRight size={12} className="ml-auto text-blue-300" />}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Support Desk Box in Drawer */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-left shrink-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-400/20">
                        <Mail size={13} />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Support Desk</h4>
                    </div>
                    <p className="text-[11px] text-slate-300/80 font-normal leading-relaxed mb-3">
                      Reach out for prompt assistance with KYC, commissions, or customer payouts.
                    </p>
                    <a
                      href="mailto:support@merlionassetholdings.com"
                      className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-slate-100 text-navy font-bold text-center py-2 px-3 rounded-xl text-xs shadow transition duration-150 cursor-pointer"
                    >
                      <Mail size={13} className="text-navy shrink-0" />
                      <span>Email Support Office</span>
                    </a>
                  </div>
                </div>

                {/* Footer Drawer */}
                <div className="p-3 border-t border-white/10 bg-navy-light/20 shrink-0 space-y-2.5">
                  <div className="flex items-center gap-2.5 bg-navy-light/30 border border-white/5 p-2.5 rounded-xl">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-400 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow shrink-0">
                      {user?.firstName?.charAt(0) || "A"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-white truncate leading-tight">{fullName}</span>
                      <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded text-blue-300 border border-blue-400/20 uppercase mt-0.5 bg-blue-500/10`}>
                        {agentLevel}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/10 bg-white/5 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                  >
                    <LogOut size={13} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              GLOBAL DESKTOP HEADER & MAIN SCROLL CONTENT
              ========================================================================= */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Desktop Top Header Bar */}
            <header className="hidden lg:flex bg-white/85 backdrop-blur-md border-b border-slate-200/80 h-16 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
              <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between px-8">
                {/* Left: Title */}
                <div className="flex items-center gap-3">
                  <h1 className="text-sm font-bold text-navy uppercase tracking-wider">
                    {menuItems.find(m => pathname === m.href)?.name || "Management Console"}
                  </h1>
                </div>

                {/* Right: Actions & User */}
                <div className="flex items-center gap-4">
                  {/* Live Sync Status indicator */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-inner">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">Live Sync</span>
                  </div>


                  {/* Quick Info bar — avatar with dropdown */}
                  <div ref={desktopProfileRef} className="relative flex items-center gap-3 border-l border-slate-200 pl-5">
                    <div className="text-right">
                      <span className="block text-xs font-bold text-navy leading-none">{fullName}</span>
                      <span className="block text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">{agentLevel}</span>
                    </div>

                    {/* Avatar button */}
                    <button
                      onClick={() => setProfileMenuOpen((o) => !o)}
                      className="relative h-9 w-9 rounded-xl bg-gradient-to-tr from-navy to-navy-light text-white flex items-center justify-center font-extrabold text-xs shadow-sm hover:ring-2 hover:ring-navy/30 transition-all focus:outline-none cursor-pointer"
                    >
                      {user?.profileImage
                        ? <img src={user.profileImage} alt="" className="h-full w-full rounded-xl object-cover" />
                        : (user?.firstName?.charAt(0) || "A")}
                    </button>

                    {/* Dropdown */}
                    {profileMenuOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setProfileMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-slate-200/80 bg-white/95 shadow-xl backdrop-blur-md overflow-hidden animate-scale-in">
                          {/* User chip */}
                          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-navy to-navy-light text-white flex items-center justify-center font-extrabold text-sm shadow">
                              {user?.profileImage
                                ? <img src={user.profileImage} alt="" className="h-full w-full rounded-xl object-cover" />
                                : (user?.firstName?.charAt(0) || "A")}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-navy truncate">{fullName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                              <span className="inline-block text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-1 border border-blue-100">
                                {agentLevel}
                              </span>
                            </div>
                          </div>

                          {/* Menu items */}
                          <div className="py-1.5">
                            <Link
                              href="/dashboard/profile"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <User size={14} className="text-slate-400" />
                              View Profile
                            </Link>
                            <a
                              href="mailto:admin@merlionassetholdings.com"
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Mail size={14} className="text-slate-400" />
                              Email Support Office
                            </a>
                          </div>

                          {/* Logout */}
                          <div className="border-t border-slate-100 py-1.5">
                            <button
                              onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <LogOut size={14} />
                              Logout
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Main content scroll container */}
            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-[1600px] w-full mx-auto relative z-10 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
              {children}

              {/* Centralised Luxury Footer */}
              <footer className="mt-12 py-5 border-t border-slate-200/60 text-center text-[10px] text-slate-400 tracking-wider font-medium">
                © 2026 Merlion Asset Holdings. All rights reserved. Registered Singapore Financial Representative Portal.
              </footer>
            </main>
          </div>

        </div>

      </div>
    </AgentContext.Provider>
  );
}
