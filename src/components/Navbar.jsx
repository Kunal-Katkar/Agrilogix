import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sprout, Menu, X, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleNavClick = (e, targetId) => {
    if (window.location.pathname !== '/') {
      navigate('/' + targetId);
    } else {
      const el = document.querySelector(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-emerald-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-[#1B1B1B]">
                Agri<span className="text-emerald-700">LogiX</span>
              </span>
              <span className="hidden sm:block text-[10px] font-semibold text-emerald-800/80 uppercase tracking-widest -mt-1">
                Farm-to-Fork Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#1B1B1B]/80">
            <button
              onClick={(e) => handleNavClick(e, '#home')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={(e) => handleNavClick(e, '#roles')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Roles
            </button>
            <button
              onClick={(e) => handleNavClick(e, '#how-it-works')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={(e) => handleNavClick(e, '#features')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={(e) => handleNavClick(e, '#about')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              About
            </button>
            <button
              onClick={(e) => handleNavClick(e, '#contact')}
              className="hover:text-emerald-700 transition-colors cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded-xl transition-all"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-98 rounded-xl shadow-md shadow-emerald-800/20 transition-all flex items-center gap-1.5"
            >
              <span>Register</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg"
            >
              Login
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-zinc-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-emerald-100 bg-white px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <button
            onClick={(e) => handleNavClick(e, '#home')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            Home
          </button>
          <button
            onClick={(e) => handleNavClick(e, '#roles')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            Roles
          </button>
          <button
            onClick={(e) => handleNavClick(e, '#how-it-works')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            How It Works
          </button>
          <button
            onClick={(e) => handleNavClick(e, '#features')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            Features
          </button>
          <button
            onClick={(e) => handleNavClick(e, '#about')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            About
          </button>
          <button
            onClick={(e) => handleNavClick(e, '#contact')}
            className="block w-full text-left py-2 text-base font-medium text-zinc-800 hover:text-emerald-700"
          >
            Contact
          </button>
          <div className="pt-3 flex flex-col gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-emerald-800 bg-emerald-50 rounded-xl"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold text-white bg-emerald-700 rounded-xl shadow-md"
            >
              Create Account
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
