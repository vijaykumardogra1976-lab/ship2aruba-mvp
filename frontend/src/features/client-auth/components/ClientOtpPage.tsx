import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyClientOTP, requestClientOTP } from "../api/clientAuthApi";
import { useClientAuth } from "../hooks/useClientAuth";

interface LocationState {
  identifier: string;
  masked: string;
  identifierType: "email" | "phone";
}

export function ClientOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithTokens } = useClientAuth();

  const state = location.state as LocationState | null;
  const identifier = state?.identifier ?? "";
  const masked = state?.masked ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no state
  useEffect(() => {
    if (!identifier) navigate("/client/login", { replace: true });
  }, [identifier, navigate]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const code = digits.join("");

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value.slice(-1);
    setDigits(updated);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const res = await verifyClientOTP({ identifier, code });
      await loginWithTokens(res.access, res.refresh);
      if (res.is_first_login) {
        navigate("/client/set-password", { replace: true });
      } else {
        navigate("/client/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Invalid code. Please try again.";
      setError(msg);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await requestClientOTP({ identifier });
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      setError("");
      inputRefs.current[0]?.focus();
    } catch {
      setError("Could not resend code. Please try again.");
    }
  };

  return (
    <div className="client-auth-bg">
      <div className="client-auth-card">
        <div className="client-auth-logo">
          <span className="client-auth-logo-icon">🚢</span>
          <span className="client-auth-logo-text">Ship2Aruba</span>
        </div>

        <h1 className="client-auth-title">Check your {state?.identifierType ?? "email"}</h1>
        <p className="client-auth-subtitle">
          We sent a 6-digit code to <strong>{masked}</strong>. Enter it below.
        </p>

        {/* OTP input boxes */}
        <div className="otp-input-row" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="otp-digit-input"
              disabled={isLoading}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && <div className="client-error">{error}</div>}

        <button
          onClick={handleVerify}
          className="client-btn-primary"
          disabled={isLoading || code.length < 6}
        >
          {isLoading ? "Verifying..." : "Verify Code"}
        </button>

        <div className="otp-resend-row">
          {resendCooldown > 0 ? (
            <span className="otp-resend-timer">Resend code in {resendCooldown}s</span>
          ) : (
            <button onClick={handleResend} className="client-link otp-resend-btn">
              Resend code
            </button>
          )}
        </div>

        <button
          onClick={() => navigate("/client/login")}
          className="client-btn-ghost"
        >
          ← Use a different email or phone
        </button>
      </div>
    </div>
  );
}
