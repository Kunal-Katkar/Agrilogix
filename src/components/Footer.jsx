import React from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Globe, Share2, MessageSquare, Mail } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Footer() {
  const { showToast } = useToast();

  const handleLinkClick = (e, name) => {
    e.preventDefault();
    showToast(`${name} page is part of upcoming Phase-II releases.`);
  };

  return (
    <footer id="contact" className="bg-[#161B16] text-zinc-300 pt-16 pb-12 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-zinc-800/80">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                Agri<span className="text-emerald-400">LogiX</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mb-6">
              A decentralized multi-tier agricultural supply chain platform connecting farmers, buyers, transporters, and cold-storage providers in one role-based workflow. This is an academic prototype with simulated payments and tracking.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="#portal"
                onClick={(e) => handleLinkClick(e, 'Global Web Portal')}
                className="w-9 h-9 rounded-lg bg-zinc-800/80 hover:bg-emerald-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Web Portal"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href="#community"
                onClick={(e) => handleLinkClick(e, 'Community Hub')}
                className="w-9 h-9 rounded-lg bg-zinc-800/80 hover:bg-emerald-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Community"
              >
                <Share2 className="w-4 h-4" />
              </a>
              <a
                href="#forum"
                onClick={(e) => handleLinkClick(e, 'Farmer Forum')}
                className="w-9 h-9 rounded-lg bg-zinc-800/80 hover:bg-emerald-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Forum"
              >
                <MessageSquare className="w-4 h-4" />
              </a>
              <a
                href="#mail"
                onClick={(e) => handleLinkClick(e, 'Support Desk')}
                className="w-9 h-9 rounded-lg bg-zinc-800/80 hover:bg-emerald-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Contact Support"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Shipment Tracking
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Order Payments
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-emerald-400 transition-colors">
                  Cold-Storage Booking
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  onClick={(e) => handleLinkClick(e, 'Pricing')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Platform Fees (2%)
                </a>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#about" className="hover:text-emerald-400 transition-colors">
                  About AgriLogiX
                </a>
              </li>
              <li>
                <a
                  href="#research"
                  onClick={(e) => handleLinkClick(e, 'B.Tech Major Project')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Academic Research
                </a>
              </li>
              <li>
                <a
                  href="#nitk"
                  onClick={(e) => handleLinkClick(e, 'NITK Surathkal')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  NITK Surathkal
                </a>
              </li>
              <li>
                <a
                  href="#careers"
                  onClick={(e) => handleLinkClick(e, 'Careers')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Careers
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => handleLinkClick(e, 'Contact')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="#privacy"
                  onClick={(e) => handleLinkClick(e, 'Privacy Policy')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#terms"
                  onClick={(e) => handleLinkClick(e, 'Terms of Service')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#disclaimer"
                  onClick={(e) => handleLinkClick(e, 'Payment Disclaimers')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Payment Rules
                </a>
              </li>
              <li>
                <a
                  href="#compliance"
                  onClick={(e) => handleLinkClick(e, 'KYC Guidelines')}
                  className="hover:text-emerald-400 transition-colors"
                >
                  KYC Verification
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-3">
          <p>© 2026 AgriLogiX. All rights reserved. Major Project-I (IT498), NITK Surathkal.</p>
          <div className="flex items-center gap-4">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Frontend UI Prototype Active</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
