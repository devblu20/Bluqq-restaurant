import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowRight, MailCheck } from "lucide-react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(900);
  const [email, setEmail] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    const stored = localStorage.getItem("pending_email");
    if (!stored) {
      router.push("/restaurant/signup");
      return;
    }
    setEmail(stored);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleDigitChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) {
      toast.error("Please enter all 6 digits");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/restaurant/auth/verify-email`, { email, code });

      // ✅ Save to localStorage
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("restaurant_id", res.data.restaurant_id);
      localStorage.removeItem("pending_email");

      toast.success("Email verified! Welcome to Bluqq 🎉");

      // ✅ Small delay taaki localStorage flush ho jaye before next page loads
      await new Promise((resolve) => setTimeout(resolve, 200));
      await router.push("/restaurant/onboarding/basic-info");

    } catch (err) {
      toast.error(err.response?.data?.detail || "Verification failed. Try again.");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await axios.post(`${API_BASE}/restaurant/auth/resend-verification`, { email });
      setCountdown(900);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      toast.success("New code sent! Check your inbox.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend. Try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        .verify-wrap {
          min-height: 100vh;
          background: #eef5f0;
          display: flex; align-items: center; justify-content: center;
          padding: 48px 16px;
          font-family: 'Inter', sans-serif;
          position: relative; overflow: hidden;
        }
        .verify-wrap::before {
          content: '';
          position: fixed; top: -120px; left: -120px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .verify-wrap::after {
          content: '';
          position: fixed; bottom: -80px; right: -80px;
          width: 340px; height: 340px; border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .verify-card {
          width: 100%; max-width: 460px;
          animation: fadeUp 0.5s ease both;
          position: relative; z-index: 1;
        }

        .verify-hero {
          background: linear-gradient(135deg, #0f3d20 0%, #1a6b3a 55%, #22a855 100%);
          border-radius: 24px 24px 0 0;
          padding: 32px 36px 28px;
          position: relative; overflow: hidden;
        }
        .verify-hero::before {
          content: '';
          position: absolute; top: -30px; right: -30px;
          width: 180px; height: 180px; border-radius: 50%;
          background: rgba(255,255,255,0.05); pointer-events: none;
        }
        .verify-hero::after {
          content: '';
          position: absolute; bottom: -20px; right: 70px;
          width: 100px; height: 100px; border-radius: 50%;
          background: rgba(0,0,0,0.07); pointer-events: none;
        }

        .hero-icon-box {
          width: 50px; height: 50px; border-radius: 14px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
          animation: popIn 0.4s ease 0.2s both;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 9px; font-weight: 800;
          color: rgba(255,255,255,0.55);
          text-transform: uppercase; letter-spacing: 0.2em;
          margin-bottom: 10px;
        }
        .hero-title {
          font-size: 26px; font-weight: 800;
          color: white; letter-spacing: -0.025em;
          line-height: 1.1; margin-bottom: 6px;
        }
        .hero-sub {
          font-size: 13px; color: rgba(255,255,255,0.55); font-weight: 500;
          margin-bottom: 12px;
        }
        .email-chip {
          display: inline-block;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.20);
          border-radius: 999px; padding: 5px 16px;
          font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.92);
        }

        .verify-body {
          background: white;
          border-radius: 0 0 24px 24px;
          padding: 30px 36px 34px;
          border: 1.5px solid #dceee3; border-top: none;
          box-shadow: 0 16px 48px rgba(26,107,58,0.12);
        }

        .field-label {
          display: block;
          font-size: 9px; font-weight: 800;
          color: #9dbeaa; text-transform: uppercase;
          letter-spacing: 0.16em; margin-bottom: 14px;
        }

        .otp-row {
          display: flex; gap: 10px; justify-content: center;
          margin-bottom: 24px;
        }
        .otp-input {
          width: 52px; height: 62px;
          background: #f4faf6;
          border: 1.5px solid #dceee3;
          border-radius: 14px;
          font-size: 28px; font-weight: 800; color: #1a6b3a;
          text-align: center;
          font-family: 'Inter', sans-serif;
          outline: none; caret-color: #1a6b3a;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .otp-input::placeholder { color: #c8e6d0; font-weight: 400; font-size: 22px; }
        .otp-input:focus {
          border-color: #1a6b3a;
          box-shadow: 0 0 0 3px rgba(26,107,58,0.10);
          background: white;
        }
        .otp-input.filled {
          background: #edf7f1;
          border-color: #22a855;
        }

        @media (max-width: 400px) {
          .otp-input { width: 42px; height: 52px; font-size: 22px; border-radius: 10px; }
          .otp-row { gap: 7px; }
          .verify-hero, .verify-body { padding-left: 20px; padding-right: 20px; }
        }

        .verify-btn {
          width: 100%;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 20px;
          background: linear-gradient(135deg, #1a6b3a, #22a855);
          border: none; border-radius: 14px;
          font-size: 14px; font-weight: 700; color: white;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(26,107,58,0.28);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        }
        .verify-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(26,107,58,0.35);
        }
        .verify-btn:active:not(:disabled) { transform: scale(0.98); }
        .verify-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .timer-row {
          text-align: center; margin-top: 16px;
          font-size: 13px; color: #9dbeaa; font-weight: 500;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          flex-wrap: wrap;
        }
        .timer-badge {
          background: #edf7f1; color: #1a6b3a;
          font-size: 12px; font-weight: 800;
          padding: 3px 10px; border-radius: 999px;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
        }
        .resend-btn {
          background: none; border: none; padding: 0;
          color: #1a6b3a; font-weight: 700; font-size: 13px;
          font-family: 'Inter', sans-serif; cursor: pointer;
          text-decoration: underline; text-underline-offset: 2px;
          transition: opacity 0.15s;
        }
        .resend-btn:disabled { color: #9dbeaa; cursor: not-allowed; text-decoration: none; }

        .divider { border: none; border-top: 1.5px solid #edf6f0; margin: 22px 0 18px; }

        .back-link {
          text-align: center;
          font-size: 13px; color: #9dbeaa; font-weight: 500;
        }
        .back-link a { color: #1a6b3a; font-weight: 700; text-decoration: none; }
        .back-link a:hover { text-decoration: underline; }
      `}</style>

      <div className="verify-wrap">
        <div className="verify-card">
          <div className="verify-hero">
            <div className="hero-badge">✉ Email verification</div>
            <div className="hero-icon-box">
              <MailCheck size={22} color="white" />
            </div>
            <h1 className="hero-title">Check your inbox 📬</h1>
            <p className="hero-sub">We sent a 6-digit code to</p>
            <div className="email-chip">{email || "your email"}</div>
          </div>

          <div className="verify-body">
            <label className="field-label">Enter verification code</label>

            <div className="otp-row" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  className={`otp-input${d ? " filled" : ""}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  placeholder="·"
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                />
              ))}
            </div>

            <button className="verify-btn" onClick={handleVerify} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Verifying...
                </>
              ) : (
                <>
                  <span>Verify &amp; Continue</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div className="timer-row">
              {countdown > 0 ? (
                <>
                  <span>Expires in</span>
                  <span className="timer-badge">{formatTime(countdown)}</span>
                  <span>·</span>
                </>
              ) : (
                <span style={{ color: "#e11d48", fontWeight: 700 }}>Code expired ·</span>
              )}
              <button
                className="resend-btn"
                onClick={handleResend}
                disabled={resending || countdown > 840}
              >
                {resending ? "Sending..." : "Resend code"}
              </button>
            </div>

            <hr className="divider" />

            <p className="back-link">
              Wrong email?{" "}
              <Link href="/restaurant/signup">Back to signup</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}