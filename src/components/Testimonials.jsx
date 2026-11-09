import React from 'react';
import { Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Farmer need',
    role: 'Illustrative scenario',
    avatar: 'FA',
    quote: 'I want to list my produce directly, set my own price and see who is ordering, instead of depending on a middleman for every sale.',
  },
  {
    name: 'Buyer need',
    role: 'Illustrative scenario',
    avatar: 'BU',
    quote: 'I want to compare farmers, see exactly what is available and where it comes from, and follow my order until it arrives.',
  },
  {
    name: 'Transporter need',
    role: 'Illustrative scenario',
    avatar: 'TR',
    quote: 'I want clear pickup and delivery details for each job, so I can fill my vehicles and keep customers updated.',
  },
];

export default function Testimonials() {
  return (
    <section id="about" className="py-20 bg-[#F9FBF7] border-b border-emerald-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-emerald-700 text-xs font-bold tracking-widest uppercase bg-emerald-100/70 px-3 py-1 rounded-md">
            Stakeholder Perspectives
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-[#1B1B1B] tracking-tight">
            Designed to Solve Real Agrarian Challenges
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-600">
            What farmers, buyers and carriers need from a connected agricultural supply chain. These are illustrative scenarios, not customer quotes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl bg-white border border-emerald-100/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group"
            >
              <Quote className="w-8 h-8 text-emerald-100 absolute top-6 right-6 group-hover:text-emerald-200 transition-colors" />

              <div>
                <p className="text-sm text-zinc-700 leading-relaxed italic mb-6">
                  "{item.quote}"
                </p>
              </div>

              {/* User Bio */}
              <div className="flex items-center gap-3 pt-4 border-t border-emerald-50">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {item.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1B1B1B]">{item.name}</h4>
                  <p className="text-xs text-zinc-500 font-medium">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
