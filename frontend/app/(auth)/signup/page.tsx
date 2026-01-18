"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Mail,
  Lock,
  User,
  AlertCircle,
  UserCog,
  Heart,
  User2,
  Phone,
} from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "../../authContext";

type Role = "PATIENT" | "VOLUNTEER";
export default function SignUpPage() {
  const { login, setToken } = useAuth();

  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "PATIENT" as Role,
    age: "",
    phoneno: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  if (formData.password !== formData.confirmPassword) {
    setError("Passwords do not match");
    return;
  }

  if (formData.password.length < 6) {
    setError("Password must be at least 6 characters");
    return;
  }

  setLoading(true);

  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/user/register`,
      {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        age: formData.age,
        phoneno: formData.phoneno,
      },
    );

    const userData = {
      id: response.data.user.id,
      name: response.data.user.name,
      email: response.data.user.email,
      role: response.data.user.role,
      phoneno: response.data.user.phoneno,
      age: response.data.user.age,
    };

    sessionStorage.setItem("user", JSON.stringify(userData));
    sessionStorage.setItem("token", response.data.token);

    if (response.data.user.role === "VOLUNTEER") {
      window.location.href = "/volunteer/dashboard";
    } else if (response.data.user.role === "PATIENT") {
      window.location.href = "/patient/dashboard";
    }
    
  } catch (err: any) {
    setError(
      err.response?.data?.msg || "Failed to sign up. Please try again.",
    );
    console.error("Signup error:", err);
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-linear-to-br from-black via-zinc-950 to-black" />
        {[...Array(80)].map((_, i) => (
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

      <Link
        href="/"
        className="absolute top-8 left-8 z-20 flex items-center gap-3 group"
      >
        <div className="relative">
          <Activity className="w-6 h-6 text-white/80" strokeWidth={1.5} />
          <div className="absolute inset-0 blur-lg bg-white/10 group-hover:bg-white/20 transition-all" />
        </div>
        <span className="text-lg font-light tracking-widest text-white/90 uppercase">
          HealthCare+
        </span>
      </Link>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extralight tracking-wider text-white/95 mb-4">
              SIGN UP
            </h1>
            <div className="w-16 h-px bg-linear-to-r from-transparent via-white/30 to-transparent mx-auto mb-6" />
            <p className="text-sm text-white/50 tracking-wide">
              Create your healthcare support account
            </p>
          </div>

          <div className="bg-zinc-950/50 backdrop-blur-xl border border-white/10 rounded-sm p-8 shadow-2xl">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs text-white/50 mb-3 tracking-wider uppercase">
                  I am a
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, role: "PATIENT" })
                    }
                    className={`p-4 rounded-sm border transition-all ${
                      formData.role === "PATIENT"
                        ? "bg-white/10 border-white/30"
                        : "bg-black/20 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 mx-auto mb-2 ${
                        formData.role === "PATIENT"
                          ? "text-white/90"
                          : "text-white/40"
                      }`}
                    />
                    <p
                      className={`text-sm tracking-wide ${
                        formData.role === "PATIENT"
                          ? "text-white/90 font-medium"
                          : "text-white/50"
                      }`}
                    >
                      PATIENT
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, role: "VOLUNTEER" })
                    }
                    className={`p-4 rounded-sm border transition-all ${
                      formData.role === "VOLUNTEER"
                        ? "bg-white/10 border-white/30"
                        : "bg-black/20 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <UserCog
                      className={`w-6 h-6 mx-auto mb-2 ${
                        formData.role === "VOLUNTEER"
                          ? "text-white/90"
                          : "text-white/40"
                      }`}
                    />
                    <p
                      className={`text-sm tracking-wide ${
                        formData.role === "VOLUNTEER"
                          ? "text-white/90 font-medium"
                          : "text-white/50"
                      }`}
                    >
                      VOLUNTEER
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Age
                </label>
                <div className="relative">
                  <User2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={formData.age}
                    onChange={(e) =>
                      setFormData({ ...formData, age: e.target.value })
                    }
                    placeholder="Your age"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Phone No.
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={formData.phoneno}
                    onChange={(e) =>
                      setFormData({ ...formData, phoneno: e.target.value })
                    }
                    placeholder="+91 98555XXXXX"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-white/50 mb-2 tracking-wider uppercase">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black rounded-sm font-medium hover:bg-white/90 transition-all text-sm tracking-wider uppercase flex items-center justify-center gap-2 group mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  "CREATING ACCOUNT..."
                ) : (
                  <>
                    CREATE ACCOUNT
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 bg-zinc-950/50 text-white/40 tracking-wider">
                    OR
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-white/50">
                  Already have an account?{" "}
                  <Link
                    href="/signin"
                    className="text-white/80 hover:text-white transition-colors font-medium tracking-wide"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-white/30 mt-8 tracking-wide">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
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
}
