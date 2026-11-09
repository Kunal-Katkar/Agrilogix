import React from 'react';
import { Sprout, ShoppingBag, Truck, Warehouse, ShieldCheck } from 'lucide-react';

export const roles = [
  { id: 'Farmer', label: 'Farmer', icon: Sprout },
  { id: 'Customer', label: 'Customer', icon: ShoppingBag },
  { id: 'Transporter', label: 'Transporter', icon: Truck },
  { id: 'StorageOwner', label: 'Storage Owner', icon: Warehouse },
  { id: 'Admin', label: 'Admin', icon: ShieldCheck },
];

export default function RoleTabs({ activeRole, onSelectRole }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 mb-6">
      {roles.map((role) => {
        const Icon = role.icon;
        const isActive = activeRole === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelectRole(role.id)}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
              isActive
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-800/20'
                : 'text-zinc-700 hover:text-emerald-800 hover:bg-emerald-100/50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{role.label}</span>
          </button>
        );
      })}
    </div>
  );
}
