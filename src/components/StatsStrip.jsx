import React, { useState } from 'react';
import { Users, ShoppingBag, Truck, Warehouse, ArrowRight, Bell } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function StatsStrip() {
  const [email, setEmail] = useState('');
  const { showToast } = useToast();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter an email to join the waitlist!');
      return;
    }
    showToast(`Thank you! ${email} has been added to the AgriLogiX waitlist.`, 'success');
    setEmail('');
  };

  return (
    <section className="py-14 bg-gradient-to-r from-emerald-900 via-green-900 to-emerald-950 text-white relative overflow-hidden">
      {/* Subtle background radial light */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.15),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-emerald-800/60 pb-10">
          <div className="pt-4 md:pt-0">
            <div className="inline-flex p-2.5 rounded-xl bg-emerald-800/50 mb-2 text-emerald-300">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-100">0</div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-300/80 mt-1">
              Registered Farmers
            </div>
          </div>

          <div className="pt-4 md:pt-0">
            <div className="inline-flex p-2.5 rounded-xl bg-emerald-800/50 mb-2 text-emerald-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-100">0</div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-300/80 mt-1">
              Active Buyers
            </div>
          </div>

          <div className="pt-4 md:pt-0">
            <div className="inline-flex p-2.5 rounded-xl bg-emerald-800/50 mb-2 text-emerald-300">
              <Truck className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-100">0</div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-300/80 mt-1">
              Verified Carriers
            </div>
          </div>

          <div className="pt-4 md:pt-0">
            <div className="inline-flex p-2.5 rounded-xl bg-emerald-800/50 mb-2 text-emerald-300">
              <Warehouse className="w-5 h-5" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-emerald-100">0</div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-300/80 mt-1">
              Storage Hubs
            </div>
          </div>
        </div>

        {/* Waitlist Callout */}
        <div className="pt-8 border-t border-emerald-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-700/80 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-emerald-200">
              Launching soon — join the priority onboarding waitlist for early access.
            </p>
          </div>

          <form onSubmit={handleJoin} className="flex w-full sm:w-auto items-center gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl bg-white/10 border border-emerald-700 text-white placeholder-emerald-300/60 focus:outline-hidden focus:ring-2 focus:ring-emerald-400 w-full sm:w-56"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-[#1B1B1B] rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
            >
              <span>Join</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
