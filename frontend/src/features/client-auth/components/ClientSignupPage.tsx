import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientSignup } from "../api/clientAuthApi";
import { useClientAuth } from "../hooks/useClientAuth";
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  Package,
  MapPin,
  CreditCard,
  Globe,
  User,
  Phone,
  Lock,
} from "lucide-react";

export function ClientSignupPage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useClientAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Please enter at least an email or phone number.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      const res = await clientSignup({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      if (res.access && res.refresh) {
        await loginWithTokens(res.access, res.refresh);
        navigate("/client/dashboard");
      } else {
        navigate("/client/login");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Signup failed. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#f8fafc] text-[#1e293b]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex w-full h-full overflow-hidden">
        {/* LEFT PANEL */}
        <div
          className="relative hidden w-1/2 flex-col justify-between bg-cover bg-center p-8 lg:flex"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(248, 250, 252, 0.95) 50%, rgba(248, 250, 252, 0.7) 100%), url('https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80')",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#7c3aed] text-white shadow-sm">
              <span className="text-xl font-bold">🚢</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black tracking-wider text-[#1e3a8a]">SHIP</span>
                <span className="text-lg font-black tracking-wider text-[#7c3aed]">2</span>
                <span className="text-lg font-black tracking-wider text-[#1e3a8a]">ARUBA</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none">
                By Innovative Distribution
              </p>
            </div>
          </div>

          <div className="my-auto max-w-md space-y-6 py-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Track & Manage <br />
                Your <span className="text-[#7c3aed]">Shipments.</span>
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                Create an account to track your orders, view invoices, and stay updated.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#7c3aed] shadow-sm">
                  <Package className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Order History</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Keep a complete record of all your current and past shipments.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#7c3aed] shadow-sm">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Real-time Tracking</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Check your packages' progress from order placement to delivery.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-white text-[#7c3aed] shadow-sm">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Easy Payments</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Manage pending balances and view recorded payment receipts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-800 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure account access.</span>
          </div>
        </div>

        {/* RIGHT PANEL: Form */}
        <div className="flex w-full flex-col justify-between bg-white p-6 sm:p-8 lg:w-1/2 h-full overflow-y-auto">
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-xl">🚢</span>
              <span className="text-md font-extrabold tracking-tight text-[#1e3a8a]">
                Ship<span className="text-[#7c3aed]">2</span>Aruba
              </span>
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
              <Globe className="h-3 w-3 text-slate-500" />
              <span>English</span>
            </div>
          </div>

          <div className="mx-auto my-auto w-full max-w-[390px] py-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sm:p-6">
              <div className="mb-5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#7c3aed]">
                  Get Started
                </span>
                <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                  Client Signup
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Create an account to manage your shipments
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="name">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-xl border border-slate-200 focus:border-[#7c3aed] focus:ring-violet-100 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition-all focus:ring-4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="email">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 focus:border-[#7c3aed] focus:ring-violet-100 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition-all focus:ring-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="phone">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        id="phone"
                        type="text"
                        placeholder="+297 5901234"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isLoading}
                        className="w-full rounded-xl border border-slate-200 focus:border-[#7c3aed] focus:ring-violet-100 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition-all focus:ring-4"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="password">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="w-full rounded-xl border border-slate-200 focus:border-[#7c3aed] focus:ring-violet-100 bg-white py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition-all focus:ring-4"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-[10px] font-semibold text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#7c3aed] py-3 text-xs font-bold text-white shadow-md shadow-violet-600/5 hover:bg-[#6d28d9] active:scale-[0.99] disabled:opacity-75 disabled:scale-100 transition-all cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-xs font-semibold text-slate-500">
                  Already have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/client/login")}
                  className="text-xs font-bold text-[#7c3aed] hover:underline"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[9px] font-bold text-slate-400 flex-shrink-0">
            <span>© 2026 Ship2Aruba. All rights reserved.</span>
            <div className="flex gap-3">
              <a href="#" className="hover:text-slate-600" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
              <a href="#" className="hover:text-slate-600" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
