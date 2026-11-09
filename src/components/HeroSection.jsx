import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Navigation, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function HeroSection() {
  const { showToast } = useToast();

  const scrollToSection = (id) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="home" className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background soft gradient and decorative blobs */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/70 via-amber-50/40 to-[#F9FBF7]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-emerald-200/30 blur-3xl rounded-full -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Top Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/60 text-emerald-900 text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          <span>Next-Generation Agricultural Logistics</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#1B1B1B] tracking-tight leading-[1.15] max-w-4xl mx-auto">
          Farm-to-Fork <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 via-green-600 to-teal-700">Supply Chain Platform</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-lg sm:text-xl text-zinc-700 max-w-2xl mx-auto font-normal leading-relaxed">
          Connecting <span className="font-semibold text-emerald-900">Farmers</span>, <span className="font-semibold text-emerald-900">Customers</span>, <span className="font-semibold text-emerald-900">Transporters</span>, and <span className="font-semibold text-emerald-900">Storage Owners</span> — from harvest to delivery.
        </p>

        {/* CTA Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            to="/register"
            className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-lg shadow-emerald-800/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <button
            onClick={() => scrollToSection('#features')}
            className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Learn More
          </button>
        </div>

        {/* Visual Pill Highlights */}
        <div className="mt-14 pt-8 border-t border-emerald-900/10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Logistics</div>
              <div className="text-sm font-bold text-zinc-900">Shipment Tracking</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Financials</div>
              <div className="text-sm font-bold text-zinc-900">Order Payments</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Market Feeds</div>
              <div className="text-sm font-bold text-zinc-900">Dynamic Pricing</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/80 border border-emerald-100 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Producer Welfare</div>
              <div className="text-sm font-bold text-zinc-900">Zero Middlemen</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
