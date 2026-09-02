import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-slate-50/30 flex lg:grid lg:grid-cols-12 overflow-hidden relative">

      {/* LEFT PANEL: Brand Visuals (Desktop Only) */}
      <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between p-12 text-white bg-navy overflow-hidden">
        {/* Background Image with Dark Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 hover:scale-105"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(11, 35, 74, 0.95) 0%, rgba(11, 35, 74, 0.85) 50%, rgba(11, 35, 74, 0.98) 100%), url('/assets/singapore.jpg')",
          }}
        />

        {/* Ambient Glowing Blobs */}
        <div className="absolute top-1/4 -left-16 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] animate-float-slow pointer-events-none z-10" />
        <div className="absolute bottom-1/4 -right-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] animate-float-slower pointer-events-none z-10" />

        {/* Content (Z-indexed above backgrounds) */}
        <div className="relative z-20">
          {/* Logo Box */}
          <div className="bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-white/10 flex items-center justify-center w-full max-w-[250px]">
            <img
              src="/assets/MAH.jpeg"
              alt="Merlion Asset Holdings"
              className="h-14 w-auto object-contain scale-125"
            />
          </div>
        </div>

        {/* Value Proposition */}
        <div className="relative z-20 my-auto max-w-[440px]">
          <span className="text-[10px] tracking-[0.3em] font-semibold text-blue-300 uppercase block mb-3 font-sans">
            Institutional Wealth Portal
          </span>
          <h1 className="text-3xl xl:text-4xl font-heading text-white leading-tight font-semibold mb-5">
            Singapore's Premier Wealth & Asset Management Portal
          </h1>
          <p className="text-xs text-slate-300 font-light leading-relaxed mb-8 font-sans">
            Access secure, enterprise-grade portal management systems. Partner with Merlion Asset Holdings to administer portfolio operations, execute agent workflows, and drive exceptional financial growth.
          </p>

          {/* Value Bullet Points */}
          <div className="space-y-4 font-sans text-xs">
            <div className="flex items-center gap-3 group">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 group-hover:scale-105 transition-all">
                ✓
              </span>
              <span className="text-slate-200">Secure Multi-factor Encryption</span>
            </div>
            <div className="flex items-center gap-3 group">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 group-hover:scale-105 transition-all">
                ✓
              </span>
              <span className="text-slate-200">Real-time Agent & Broker Tools</span>
            </div>
            <div className="flex items-center gap-3 group">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20 group-hover:scale-105 transition-all">
                ✓
              </span>
              <span className="text-slate-200">Dedicated Institutional Support</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-20 text-[9px] text-slate-400 tracking-[0.25em] font-sans uppercase">
          Merlion Asset Holdings • Singapore
        </div>
      </div>

      {/* RIGHT PANEL: Form Container */}
      <div className="col-span-1 lg:col-span-7 flex flex-col justify-between items-center w-full min-h-screen px-4 py-8 sm:px-8 md:px-16 bg-white relative z-10 overflow-y-auto overflow-x-hidden">

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="w-full lg:hidden flex flex-col items-center mb-6 mt-4">
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm flex items-center justify-center w-full max-w-[220px] mb-4">
            <img
              src="/assets/MAH.jpeg"
              alt="Merlion Asset Holdings"
              className="h-14 w-auto object-contain scale-125"
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-[400px] my-auto flex flex-col">
          {/* Desktop Title & Subtitle */}
          <div className="mb-6 hidden lg:block">
            <h2 className="text-2xl xl:text-3xl font-heading text-navy font-semibold leading-tight mb-1">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 font-sans font-light">
                {subtitle}
              </p>
            )}
          </div>

          {/* Mobile/Tablet Title & Subtitle */}
          <div className="mb-6 lg:hidden text-center">
            <h2 className="text-xl sm:text-2xl font-heading text-navy font-semibold leading-tight mb-1">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-400 font-sans font-light">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form Context */}
          <div className="w-full">
            {children}
          </div>
        </div>

        {/* Desktop & Mobile Footer Copyright */}
        <div className="text-[9px] text-slate-400 tracking-wider font-sans text-center mt-6">
          © 2026 Merlion Asset Holdings. All rights reserved.
        </div>
      </div>

    </div>
  );
}
