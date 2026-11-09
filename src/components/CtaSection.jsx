import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sprout, CheckCircle2 } from 'lucide-react';

export default function CtaSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-800 via-green-800 to-teal-900 text-white p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl shadow-emerald-950/20">
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold mb-6">
              <Sprout className="w-4 h-4" />
              <span>Direct Agriculture • Zero Middlemen • Transparent Pricing</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Be part of the farm-to-fork revolution
            </h2>

            <p className="mt-5 text-base sm:text-lg text-emerald-100 font-normal leading-relaxed max-w-2xl mx-auto">
              Empower producers, streamline freight transit, and secure instant guaranteed payments with AgriLogiX. Register your role today.
            </p>

            {/* Feature Bullets */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-emerald-200 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero Onboarding Fees</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instant Bank Settlements</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Shipment Tracking</span>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-4 text-base font-bold text-emerald-950 bg-white hover:bg-emerald-50 active:scale-98 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Sign Up Now</span>
                <ArrowRight className="w-5 h-5 text-emerald-800" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-emerald-100 hover:text-white bg-emerald-900/60 hover:bg-emerald-900/80 border border-emerald-700/80 rounded-xl transition-all text-center"
              >
                Explore Workspace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
