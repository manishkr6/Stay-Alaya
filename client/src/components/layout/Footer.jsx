import React from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
  Heart,
  ShieldCheck,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0B192C] text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 flex items-center justify-center border border-amber-400/40 shadow-xs bg-white">
                <img
                  src="/logo1.png"
                  alt="Stay Aalaya logo"
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/logo.png";
                  }}
                />
              </div>
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-serif text-2xl font-black tracking-tight text-white"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Stay <span className="text-[#f5a623]">Aalaya</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold tracking-widest uppercase text-slate-300"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    ROOMS & PG FINDER
                  </span>
                  <span className="bg-[#f5a623] text-[#0B192C] text-[8px] font-black px-1.5 py-0.2 rounded tracking-wider uppercase">
                    SIKKIM
                  </span>
                </div>
              </div>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              Sikkim's dedicated platform for physically verified student accommodations,
              paying guests, and rooms across Gangtok, Tadong, Majitar, and Namchi. Zero brokerage, 100% direct host connection.
            </p>
            <div className="flex gap-3 pt-2">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 bg-slate-800/80 hover:bg-[#f5a623] hover:text-[#0B192C] text-slate-300 rounded-full flex items-center justify-center transition-all shadow-sm"
                  aria-label="Social Link"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-5 text-xs uppercase tracking-wider text-[#f5a623]">
              Explore Sikkim
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              {[
                { label: 'Explore All PGs', to: '/find-pg' },
                { label: 'Gangtok (ICFAI University)', to: '/find-pg?locality=Gangtok' },
                { label: 'Tadong (SMIMS Hub)', to: '/find-pg?locality=Tadong' },
                { label: 'Majitar (SMIT Campus)', to: '/find-pg?locality=Majitar' },
                { label: '5th Mile (Sikkim University)', to: '/find-pg?locality=5th Mile' },
                { label: 'List Your PG (Free)', to: '/list-your-pg' },
                { label: 'About Stay Aalaya', to: '/about' },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="hover:text-[#f5a623] text-slate-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Inspection Office */}
          <div>
            <h4 className="text-white font-bold mb-5 text-xs uppercase tracking-wider text-[#f5a623]">
              Inspection Office
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm text-slate-400">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="text-[#f5a623] shrink-0 mt-0.5" />
                <span>Development Area, Gangtok, Sikkim 737101</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-[#f5a623] shrink-0" />
                <a href="mailto:support@stayaalaya.in" className="hover:text-white transition-colors">
                  support@stayaalaya.in
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-[#f5a623] shrink-0" />
                <span>+91 98320 45612</span>
              </li>
              <li className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[11px] font-semibold">
                  <ShieldCheck size={12} /> 14-Point Ground Verification Active
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t border-slate-800/80 bg-[#071322]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Stay Aalaya Sikkim. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-[#f5a623] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-service" className="hover:text-[#f5a623] transition-colors">
              Terms of Service
            </Link>
            <span className="text-slate-600">Built with care for Sikkim</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
