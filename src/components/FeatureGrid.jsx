import React from 'react';
import { 
  Navigation, 
  ShieldCheck, 
  Warehouse, 
  Cpu, 
  TrendingUp, 
  LayoutDashboard, 
  QrCode, 
  BarChart3 
} from 'lucide-react';

const features = [
  {
    title: 'Shipment Tracking',
    icon: Navigation,
    description: 'Tracking ID, status timeline and progress for every shipment. Live GPS is planned for the final release.',
    tag: 'Prototype',
  },
  {
    title: 'Payments & Invoices',
    icon: ShieldCheck,
    description: 'Payment status for every order with a simulated checkout. Gateway settlement and escrow are planned.',
    tag: 'Simulated',
  },
  {
    title: 'Storage Booking',
    icon: Warehouse,
    description: 'Farmers search cold storage and warehouses and request capacity; owners accept or reject.',
    tag: 'Cold Chain',
  },
  {
    title: 'Transport Booking',
    icon: Cpu,
    description: 'Farmers find vehicles by area, type, capacity and price; transporters accept requests and update status.',
    tag: 'Logistics',
  },
  {
    title: 'Farmer-Set Pricing',
    icon: TrendingUp,
    description: 'Farmers set their own price and quantity per listing, with no retailer margin in between.',
    tag: 'Pricing',
  },
  {
    title: 'Multi-Role Dashboards',
    icon: LayoutDashboard,
    description: 'Strictly isolated operational cockpits tailored for Farmers, Buyers, Drivers, and Warehouse operators.',
    tag: 'RBAC',
  },
  {
    title: 'QR Traceability (Planned)',
    icon: QrCode,
    description: 'End-to-end digital provenance receipts linking land records with in-transit telemetry logs.',
    tag: 'Coming Soon',
    comingSoon: true,
  },
  {
    title: 'Market Price Feed (Planned)',
    icon: BarChart3,
    description: 'Reference mandi rates to help farmers price their produce. Planned for the final release.',
    tag: 'Coming Soon',
    comingSoon: true,
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20 bg-white border-t border-emerald-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-700 text-xs font-bold tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-md">
            Technical Capabilities
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#1B1B1B] tracking-tight">
            Comprehensive Platform Features
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            Engineered with modern cloud architecture to eliminate logistical blind spots, counterparty payment defaults, and horticultural spoilage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="relative p-6 rounded-2xl bg-[#F9FBF7] border border-emerald-100/80 hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      feature.comingSoon 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100/80 text-emerald-800'
                    }`}>
                      {feature.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#1B1B1B] mb-2 group-hover:text-emerald-800 transition-colors">
                    {feature.title}
                  </h3>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-100/50 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                  <span>Architecture Verified</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
