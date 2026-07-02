import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { loginSchema, type LoginFormValues } from "../schema/loginSchema";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  ArrowRight,
  Users,
  Package,
  MapPin,
  Headphones,
  ShieldCheck,
} from "lucide-react";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError(null);
    try {
      await login(values.email, values.password);
      navigate("/orders/new");
    } catch {
      setError("Invalid email or password.");
    }
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-[#f8fafc] text-[#1e293b]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Container holding both panels */}
      <div className="flex w-full h-full overflow-hidden">
        {/* LEFT PANEL: Branding & Info (Hidden on small mobile, shows on lg) */}
        <div
          className="relative hidden w-1/2 flex-col justify-between bg-cover bg-center p-8 lg:flex"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(248, 250, 252, 0.95) 50%, rgba(248, 250, 252, 0.7) 100%), url('https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1200&q=80')",
          }}
        >
          {/* Logo & Header */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#dc2626] text-white shadow-sm">
              <span className="text-xl font-bold">🚢</span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-black tracking-wider text-[#1e3a8a]">SHIP</span>
                <span className="text-lg font-black tracking-wider text-[#dc2626]">2</span>
                <span className="text-lg font-black tracking-wider text-[#1e3a8a]">ARUBA</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none">
                By Innovative Distribution
              </p>
            </div>
          </div>

          {/* Marketing/Hero Info */}
          <div className="my-auto max-w-md space-y-6 py-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Delivering More <br />
                Than Just <span className="text-[#dc2626]">Packages.</span>
              </h1>
              <p className="text-sm leading-relaxed text-slate-600 font-medium">
                Ship2Aruba connects the world to Aruba with reliable shipping,
                transparent tracking, and unmatched service.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4">
              {/* Feature 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white text-[#dc2626] shadow-sm">
                  <Package className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Reliable Shipping</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Secure and on-time delivery you can count on.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white text-[#dc2626] shadow-sm">
                  <MapPin className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Real-time Tracking</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Track your shipments every step of the way.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-red-100 bg-white text-[#dc2626] shadow-sm">
                  <Headphones className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Dedicated Support</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-tight">
                    Our team is here to assist you 24/7.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom badge */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/80 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-800 backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Your shipments are in safe hands with Ship2Aruba.</span>
          </div>
        </div>

        {/* RIGHT PANEL: Form (Full width on small, 1/2 on lg) */}
        <div className="flex w-full flex-col justify-between bg-white p-6 sm:p-8 lg:w-1/2 h-full overflow-y-auto">
          {/* Top Row: Mobile Logo + Language Selector */}
          <div className="flex items-center justify-between flex-shrink-0">
            {/* Show logo on mobile/tablet */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-xl">🚢</span>
              <span className="text-md font-extrabold tracking-tight text-[#1e3a8a]">
                Ship<span className="text-[#dc2626]">2</span>Aruba
              </span>
            </div>

            {/* Language Dropdown */}
            <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm cursor-pointer hover:bg-slate-50 transition-all">
              <Globe className="h-3 w-3 text-slate-500" />
              <span>English</span>
              <svg className="h-2.5 w-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Login Card Container */}
          <div className="mx-auto my-auto w-full max-w-[390px] py-4">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sm:p-6">
              {/* Form Header */}
              <div className="mb-5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#dc2626]">
                  Welcome Back
                </span>
                <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900">
                  Staff Login
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Sign in to your staff account to continue
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      autoFocus
                      placeholder="Enter your email"
                      {...register("email")}
                      className={`w-full rounded-xl border ${
                        errors.email ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-[#dc2626] focus:ring-red-100"
                      } bg-white py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition-all focus:ring-4`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-semibold text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      {...register("password")}
                      className={`w-full rounded-xl border ${
                        errors.password ? "border-red-400 focus:ring-red-100" : "border-slate-200 focus:border-[#dc2626] focus:ring-red-100"
                      } bg-white py-2.5 pl-10 pr-10 text-xs text-slate-800 outline-none transition-all focus:ring-4`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[10px] font-semibold text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Error message */}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-100 p-2.5 text-[10px] font-semibold text-red-600">
                    {error}
                  </div>
                )}

                {/* Remember Me / Forgot Password */}
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#dc2626] focus:ring-[#dc2626] cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="text-[#dc2626] hover:underline" onClick={(e) => e.preventDefault()}>
                    Forgot Password?
                  </a>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#dc2626] py-3 text-xs font-bold text-white shadow-md shadow-red-600/5 hover:bg-[#b91c1c] active:scale-[0.99] disabled:opacity-75 disabled:scale-100 transition-all cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <span className="relative bg-white px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  OR
                </span>
              </div>

              {/* Client portal transition button */}
              <button
                type="button"
                onClick={() => navigate("/client/login")}
                className="flex w-full items-center justify-between rounded-xl bg-red-50/30 hover:bg-red-50 border border-red-100/50 px-3.5 py-3 text-xs font-bold text-[#dc2626] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <div className="text-left">
                    <span className="block font-extrabold leading-none">Login as Client / Customer</span>
                    <span className="block text-[9px] font-medium text-slate-400 mt-0.5 leading-none">
                      Track your orders and shipments
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Footer */}
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
