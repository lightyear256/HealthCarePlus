"use client";
import { Stethoscope } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-b from-black via-zinc-950 to-black" />
        {[...Array(100)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 0.5 + "px",
              height: Math.random() * 2 + 0.5 + "px",
              top: Math.random() * 100 + "%",
              left: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5 + 0.3,
              animation: `twinkle ${Math.random() * 4 + 3}s infinite ${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[100px_100px]" />

      <div className=" pt-25 relative z-10 max-w-6xl mx-auto px-4 text-center pb-10">
        <div className="mb-8 inline-block">
          <div className="relative">
            <Stethoscope className="w-16 h-16 text-white/80" strokeWidth={1} />
            <div className="absolute inset-0 blur-2xl bg-white/20 animate-pulse" />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-extralight mb-6 tracking-wider">
          <span className="text-white/95 block mb-2">ADVANCED</span>
          <span className="text-white/60">HEALTHCARE SUPPORT</span>
        </h1>

        <div className="w-24 h-px bg-linear-to-r from-transparent via-white/30 to-transparent mx-auto mb-8" />

        <p className="text-lg md:text-xl text-white/50 mb-12 max-w-2xl mx-auto font-light tracking-wide leading-relaxed">
          AI-powered patient support connecting you with volunteers and medical
          resources
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="/signin"
            className="group px-8 py-3 bg-white text-black rounded-sm font-medium hover:bg-white/90 transition-all flex items-center gap-3 text-sm tracking-wider uppercase"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="px-8 py-3 bg-transparent border border-white/20 text-white/80 rounded-sm font-medium hover:bg-white/5 hover:border-white/40 transition-all flex items-center gap-3 text-sm tracking-wider uppercase"
          >
            Sign Up
          </a>
        </div>

        <div className="grid grid-cols-3 gap-8 mt-24 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-light text-white/90 mb-2">24/7</div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              Support
            </div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-3xl font-light text-white/90 mb-2">500+</div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              Volunteers
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-light text-white/90 mb-2">10K+</div>
            <div className="text-xs text-white/40 tracking-widest uppercase">
              Patients
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-red-500 text-white">
      <Hero />
    </div>
  );
}
