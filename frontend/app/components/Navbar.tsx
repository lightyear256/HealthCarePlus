"use client";

import { useState } from "react";
import { Activity, LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../authContext";
export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return null;
  }

  return (
    <nav className="fixed w-full top-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-6 h-6 text-white/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-lg bg-white/10 animate-pulse" />
            </div>
            <span className="text-lg font-light tracking-widest text-white/90 uppercase">
              HealthCare+
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#services"
              className="text-sm text-white/60 hover:text-white/90 transition-colors tracking-wide"
            >
              SERVICES
            </a>
            <a
              href="#about"
              className="text-sm text-white/60 hover:text-white/90 transition-colors tracking-wide"
            >
              ABOUT
            </a>
            <a
              href="#contact"
              className="text-sm text-white/60 hover:text-white/90 transition-colors tracking-wide"
            >
              CONTACT
            </a>

            {user ? (
              <div className="flex items-center gap-4 ml-4">
                <span className="text-sm text-white/80 tracking-wide">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-sm hover:bg-white/10 hover:border-white/20 transition-all text-sm tracking-wide"
                >
                  <LogOut className="w-4 h-4" />
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="flex gap-3 ml-4">
                <Link
                  href="/signin"
                  className="px-5 py-2 text-sm text-white/70 hover:text-white/90 border border-white/10 hover:border-white/20 rounded-sm transition-all tracking-wide"
                >
                  SIGN IN
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2 text-sm bg-white text-black rounded-sm hover:bg-white/90 transition-all tracking-wide font-medium"
                >
                  SIGN UP
                </Link>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white/80"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-6 border-t border-white/5">
            <div className="flex flex-col gap-4">
              <a
                href="#services"
                className="text-sm text-white/60 hover:text-white/90 tracking-wide"
              >
                SERVICES
              </a>
              <a
                href="#about"
                className="text-sm text-white/60 hover:text-white/90 tracking-wide"
              >
                ABOUT
              </a>
              <a
                href="#contact"
                className="text-sm text-white/60 hover:text-white/90 tracking-wide"
              >
                CONTACT
              </a>

              {user ? (
                <>
                  <span className="text-sm text-white/80 pt-2 border-t border-white/5">
                    {user.name}
                  </span>
                  <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-sm w-fit text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    LOGOUT
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                  <Link
                    href="/signin"
                    className="px-4 py-2 text-sm text-white/70 border border-white/10 rounded-sm text-center"
                  >
                    SIGN IN
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm bg-white text-black rounded-sm text-center"
                  >
                    SIGN UP
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
