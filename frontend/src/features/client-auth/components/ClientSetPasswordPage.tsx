import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setClientPassword } from "../api/clientAuthApi";
import { useClientAuth } from "../hooks/useClientAuth";

export function ClientSetPasswordPage() {
  const navigate = useNavigate();
  const { user } = useClientAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await setClientPassword({ password, confirm_password: confirmPassword });
      navigate("/client/dashboard", { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to set password. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="client-auth-bg">
      <div className="client-auth-card">
        <div className="client-auth-logo">
          <span className="client-auth-logo-icon">🚢</span>
          <span className="client-auth-logo-text">Ship2Aruba</span>
        </div>

        <h1 className="client-auth-title">Welcome, {user?.name?.split(" ")[0] || "there"}!</h1>
        <p className="client-auth-subtitle">
          Since this is your first time logging in, please set a secure password for your account.
        </p>

        <form onSubmit={handleSubmit} className="client-auth-form">
          <div className="client-field">
            <label className="client-label" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="client-input"
              disabled={isLoading}
            />
          </div>

          <div className="client-field">
            <label className="client-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Type your password again"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="client-input"
              disabled={isLoading}
            />
          </div>

          {error && <div className="client-error">{error}</div>}

          <button
            type="submit"
            className="client-btn-primary"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? "Saving..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
