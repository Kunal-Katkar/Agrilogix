import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, ShoppingBag, Truck, Warehouse, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const rolesData = [
  {
    id: 'farmer',
    title: 'Farmer',
    subtitle: 'Primary Agricultural Producer',
    icon: Sprout,
    badge: 'Producers',
    color: 'emerald',
    description: 'List your produce, book storage and transport, track shipments, view payouts.',
    benefits: [
      'Direct fair-price market access',
      'Public farmer profile with all listings',
      'Orders and payment status in one place',
      'Cold-storage interim booking'
    ],
  },
  {
    id: 'customer',
    title: 'Customer',
    subtitle: 'Bulk & Commercial Buyer',
    icon: ShoppingBag,
    badge: 'Buyers',
    color: 'amber',
    description: 'Browse verified produce, place bulk orders, track delivery, pay securely.',
    benefits: [
      'Produce listed directly by farmers',
      'Browse farmers and their produce',
      'Order status and shipment tracking page',
      'Enquiries answered by the farmer'
    ],
  },
  {
    id: 'transporter',
    title: 'Transporter',
    subtitle: 'Freight & Fleet Logistics',
    icon: Truck,
    badge: 'Logistics',
    color: 'blue',
    description: 'Register your vehicles and service areas, accept transport requests, update shipment status.',
    benefits: [
      'Requests matched by area and capacity',
      'Reduced deadhead empty-miles',
      'Clear pickup and destination details',
      'Shipment status updates in one tap'
    ],
  },
  {
    id: 'storage-owner',
    title: 'Storage Owner',
    subtitle: 'Cold-Storage & Warehouse',
    icon: Warehouse,
    badge: 'Infrastructure',
    color: 'teal',
    description: 'List storage capacity, manage availability, and respond to booking requests from farmers.',
    benefits: [
      'Monetize spare cold chamber volume',
      'Capacity and pricing under your control',
      'Accept or reject booking requests',
      'Capacity released when bookings complete'
    ],
  },
];

export default function RoleCard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleLearnMore = (role) => {
    showToast(`Exploring ${role.title} workspace: Register to access tailored features!`);
  };

  return (
    <section id="roles" className="py-20 bg-white border-y border-emerald-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-700 text-xs font-bold tracking-widest uppercase bg-emerald-50 px-3 py-1 rounded-md">
            Ecosystem Stakeholders
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#1B1B1B] tracking-tight">
            Built For Every Pillar of the Supply Chain
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            Tailored workspaces designed to solve specific operational pain points for producers, buyers, carriers, and warehouse facilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {rolesData.map((role) => {
            const Icon = role.icon;
            return (
              <div
                key={role.id}
                className="group relative flex flex-col p-6 rounded-2xl bg-[#F9FBF7] border border-emerald-100/80 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Header Icon & Badge */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100/70 text-emerald-800">
                    {role.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-[#1B1B1B] group-hover:text-emerald-800 transition-colors">
                  {role.title}
                </h3>
                <p className="text-xs font-semibold text-zinc-500 mb-3">{role.subtitle}</p>
                <p className="text-sm text-zinc-600 leading-relaxed mb-6 flex-grow">
                  {role.description}
                </p>

                {/* Micro Benefits */}
                <div className="space-y-2 mb-6 border-t border-emerald-100/60 pt-4">
                  {role.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleLearnMore(role)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-700 hover:text-white border border-emerald-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
