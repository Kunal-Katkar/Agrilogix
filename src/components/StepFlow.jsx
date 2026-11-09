import React from 'react';
import { ClipboardList, Snowflake, Truck, ShieldCheck, QrCode } from 'lucide-react';

const steps = [
  {
    step: '1',
    title: 'List Produce',
    icon: ClipboardList,
    description: 'Farmer catalogs crop variety, grade, harvest date, and baseline price.',
  },
  {
    step: '2',
    title: 'Store (Optional)',
    icon: Snowflake,
    description: 'Request cold storage or warehouse capacity to hold produce before dispatch.',
  },
  {
    step: '3',
    title: 'Transport',
    icon: Truck,
    description: 'Farmer requests a vehicle; the transporter accepts and updates the shipment status.',
  },
  {
    step: '4',
    title: 'Pay',
    icon: ShieldCheck,
    description: 'Buyer pays through a simulated checkout; real gateway settlement is planned.',
  },
  {
    step: '5',
    title: 'Trace',
    icon: QrCode,
    description: 'Follow the order and shipment timeline. QR traceability is planned for later.',
  },
];

export default function StepFlow() {
  return (
    <section id="how-it-works" className="py-20 bg-[#F9FBF7] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-700 text-xs font-bold tracking-widest uppercase bg-emerald-100/70 px-3 py-1 rounded-md">
            Operational Lifecycle
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#1B1B1B] tracking-tight">
            How AgriLogiX Works
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            A transparent five-step workflow orchestrating agricultural commerce from farm gate to terminal delivery dock.
          </p>
        </div>

        {/* Horizontal Flow */}
        <div className="relative">
          {/* Connector Line (visible on desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-12 right-12 h-1 bg-gradient-to-r from-emerald-300 via-green-400 to-emerald-500 -translate-y-6 z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white border border-emerald-100 shadow-sm hover:shadow-md transition-shadow group"
                >
                  {/* Step Number Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shadow-md">
                    {item.step}
                  </div>

                  {/* Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mt-3 mb-4 group-hover:bg-emerald-700 group-hover:text-white transition-colors duration-300 shadow-inner">
                    <Icon className="w-7 h-7" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-[#1B1B1B] mb-2">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
