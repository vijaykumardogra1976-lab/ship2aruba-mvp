import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { changePassword, updateMe } from "@/features/auth/api/authApi";
import {
  ChevronDown,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const Ship2ArubaLogo = () => (
  <div className="flex items-center gap-2 select-none cursor-pointer">
    <span className="text-xl font-extrabold text-blue-900 tracking-tight">Ship2aruba</span>
    <svg className="h-6 w-12 shrink-0" viewBox="0 0 120 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Overlapping rotated squares representing packages */}
      <rect x="50" y="5" width="20" height="20" rx="2" transform="rotate(45 50 5)" fill="#0018A8" />
      <rect x="68" y="10" width="20" height="20" rx="2" transform="rotate(45 68 10)" fill="#0018A8" />
      <rect x="42" y="22" width="20" height="20" rx="2" transform="rotate(45 42 22)" fill="#0018A8" />
      <rect x="80" y="25" width="16" height="16" rx="2" transform="rotate(45 80 25)" fill="#50C878" />
      <rect x="65" y="38" width="12" height="12" rx="1.5" transform="rotate(45 65 38)" fill="#FF7F50" />
      <rect x="52" y="44" width="10" height="10" rx="1" transform="rotate(45 52 44)" fill="#FF7F50" />
    </svg>
  </div>
);

export function TopBar() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Editable Profile inputs
  const [fullNameInput, setFullNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveSuccess, setProfileSaveSuccess] = useState("");

  // Password reset fields
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const originalName = user?.full_name || "";
  const originalEmail = user?.email || "";
  const originalPhone = localStorage.getItem("profile_phone_number") || "+297 592 1854";

  // Initialize inputs on profile dialog opening
  useEffect(() => {
    if (profileOpen && user) {
      setFullNameInput(user.full_name || "");
      setEmailInput(user.email || "");
      setPhoneInput(localStorage.getItem("profile_phone_number") || "+297 592 1854");
      setProfileSaveError("");
      setProfileSaveSuccess("");
      setResetError("");
      setResetSuccess("");
      setShowResetPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [profileOpen, user]);

  const hasProfileChanges =
    fullNameInput.trim() !== originalName ||
    emailInput.trim() !== originalEmail ||
    phoneInput.trim() !== originalPhone;

  const handleProfileCancel = () => {
    setFullNameInput(originalName);
    setEmailInput(originalEmail);
    setPhoneInput(originalPhone);
    setProfileSaveError("");
    setProfileSaveSuccess("");
  };

  const handleProfileSave = async () => {
    setProfileSaveError("");
    setProfileSaveSuccess("");
    setIsSavingProfile(true);
    try {
      // Call PATCH /auth/me/
      const updatedUser = await updateMe({
        email: emailInput.trim(),
        full_name: fullNameInput.trim(),
      });
      // Save phone number in localStorage
      localStorage.setItem("profile_phone_number", phoneInput.trim());
      // Update local state in AuthProvider
      setUser(updatedUser);
      setProfileSaveSuccess("Profile updated successfully!");
    } catch (err: any) {
      setProfileSaveError(err.response?.data?.detail || "Failed to update profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setResetError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("New passwords do not match.");
      return;
    }

    setIsResetting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setResetSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setResetError(err.response?.data?.detail || "Failed to update password. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const userInitials = user
    ? (user.full_name || user.email)
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "U";

  const userRole = user?.role === "admin" ? "Administrator" : "Staff Member";

  return (
    <header className="h-14 w-full border-b border-slate-200 bg-white px-5 flex items-center justify-between z-45 shrink-0">
      {/* Left: Logo with Name */}
      <div onClick={() => navigate("/orders")}>
        <Ship2ArubaLogo />
      </div>

      {/* Right: User profile information */}
      {user && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 transition cursor-pointer text-left"
          >
            {/* Avatar Circle */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white shadow-xs">
              {userInitials}
            </div>
            {/* User Name & Role */}
            <div className="hidden sm:block">
              <p className="text-xs font-extrabold text-slate-800 leading-tight">
                {user.full_name || user.email.split("@")[0]}
              </p>
              <p className="text-[10px] text-slate-500 font-bold leading-none mt-0.5">
                {userRole}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 hidden sm:block" />
          </button>

          {/* Quick Dropdown Menu */}
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-45" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg z-50 animate-in fade-in-50 slide-in-from-top-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    setProfileOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-slate-400" />
                  View Profile
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50/50 cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-rose-500" />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Profile Modal dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-lg p-5 rounded-2xl bg-white shadow-xl border border-slate-100">
          <div className="space-y-4 text-left animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-none">Staff Profile</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-500 font-bold mt-1">
                Personal details and login password reset options.
              </DialogDescription>
            </div>

            {/* Profile Information Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Full Name */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/40 p-2.5 border border-slate-100/40 transition hover:bg-slate-50/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="profile-fullname" className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none block">Full Name</label>
                  <input
                    id="profile-fullname"
                    type="text"
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    className="text-xs font-bold text-slate-800 leading-tight block w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-hidden mt-0.5"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/40 p-2.5 border border-slate-100/40 transition hover:bg-slate-50/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="profile-email" className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none block">Email</label>
                  <input
                    id="profile-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="text-xs font-bold text-slate-800 leading-tight block w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-hidden mt-0.5"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/40 p-2.5 border border-slate-100/40 transition hover:bg-slate-50/70">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="profile-phone" className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none block">Phone</label>
                  <input
                    id="profile-phone"
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="text-xs font-bold text-slate-800 leading-tight block w-full bg-transparent border-0 p-0 focus:ring-0 focus:outline-hidden mt-0.5"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 rounded-xl bg-slate-50/20 p-2.5 border border-slate-100/10 opacity-75 select-none">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider leading-none block">System Role</span>
                  <span className="text-xs font-bold text-slate-500 leading-tight block mt-0.5 truncate">
                    {userRole}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Change Save / Cancel Buttons */}
            {hasProfileChanges && (
              <div className="flex items-center justify-end gap-2.5 pt-1 animate-in fade-in slide-in-from-top-1.5 duration-200">
                <button
                  type="button"
                  onClick={handleProfileCancel}
                  className="inline-flex h-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="inline-flex h-8.5 items-center justify-center rounded-lg bg-violet-600 px-4 text-xs font-bold text-white hover:bg-violet-750 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}

            {/* Profile Alert Messages */}
            {profileSaveSuccess && (
              <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 animate-in fade-in">{profileSaveSuccess}</p>
            )}
            {profileSaveError && (
              <p className="text-[10px] text-red-500 font-bold bg-red-50/50 px-3 py-2 rounded-lg border border-red-100/50 animate-in fade-in">{profileSaveError}</p>
            )}

            {/* Password Reset Toggle */}
            <div className="border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowResetPasswordForm(!showResetPasswordForm)}
                className="w-full text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:text-violet-700 transition cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-violet-600" />
                  Reset Password Options
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-250 ${showResetPasswordForm ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Password Reset Form Content */}
            {showResetPasswordForm && (
              <div className="space-y-3 mt-1.5 animate-in fade-in duration-200 slide-in-from-top-1.5">
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="current-pass">
                        Current Password
                      </label>
                      <input
                        id="current-pass"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="new-pass">
                        New Password
                      </label>
                      <input
                        id="new-pass"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden font-semibold"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-750 uppercase tracking-wider" htmlFor="confirm-pass">
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-pass"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-violet-500 focus:outline-hidden font-semibold"
                      />
                    </div>
                  </div>

                  {resetError && (
                    <p className="text-[10px] text-red-500 font-bold bg-red-50/50 px-3 py-2 rounded-lg border border-red-100/50 animate-in fade-in">{resetError}</p>
                  )}

                  {resetSuccess && (
                    <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 animate-in fade-in">{resetSuccess}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full inline-flex h-8.5 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold text-white hover:bg-violet-750 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isResetting ? "Updating..." : "Reset Password"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
