import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { login } from "../../services/api";
import { UtensilsCrossed, Loader2, ArrowRight, Flame } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await login(data);
      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("restaurant_id", res.data.restaurant_id);
      toast.success("Welcome back!");
      router.push("/restaurant/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }

        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }

        .login-wrap {
          min-height: 100vh;
          background: #eef5f0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Subtle background blobs */
        .login-wrap::before {
          content: '';
          position: fixed;
          top: -120px; left: -120px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.10) 0%, transparent 70%);
          pointer-events: none;
        }
        .login-wrap::after {
          content: '';
          position: fixed;
          bottom: -80px; right: -80px;
          width: 340px; height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(26,107,58,0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          animation: fadeUp 0.5s ease both;
          position: relative;
          z-index: 1;
        }

        /* Hero banner at top of card */
        .login-hero {
          background: linear-gradient(135deg, #0f3d20 0%, #1a6b3a 55%, #22a855 100%);
          border-radius: 24px 24px 0 0;
          padding: 34px 36px 30px;
          position: relative;
          overflow: hidden;
        }
        .login-hero::before {
          content: '';
          position: absolute;
          top: -30px; right: -30px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          pointer-events: none;
        }
        .login-hero::after {
          content: '';
          position: absolute;
          bottom: -20px; right: 60px;
          width: 90px; height: 90px;
          border-radius: 50%;
          background: rgba(0,0,0,0.07);
          pointer-events: none;
        }

        .hero-logo {
          width: 50px; height: 50px;
          border-radius: 14px;
          background: rgba(255,255,255,0.15);
          border: 1.5px solid rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
          backdrop-filter: blur(6px);
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
          font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 500;
        }

        /* Form body */
        .login-body {
          background: white;
          border-radius: 0 0 24px 24px;
          padding: 30px 36px 32px;
          border: 1.5px solid #dceee3;
          border-top: none;
          box-shadow: 0 16px 48px rgba(26,107,58,0.12);
        }

        .field-label {
          display: block;
          font-size: 9px; font-weight: 800;
          color: #9dbeaa; text-transform: uppercase;
          letter-spacing: 0.16em; margin-bottom: 7px; margin-left: 2px;
        }

        .field-input {
          width: 100%;
          padding: 11px 16px;
          background: #f4faf6;
          border: 1.5px solid #dceee3;
          border-radius: 12px;
          font-size: 14px; color: #111827;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input::placeholder { color: #b8d8c4; }
        .field-input:focus {
          border-color: #1a6b3a;
          box-shadow: 0 0 0 3px rgba(26,107,58,0.10);
        }

        .field-error {
          font-size: 10px; font-weight: 700; color: #e11d48;
          margin-top: 5px; margin-left: 2px; font-style: italic;
        }

        .submit-btn {
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
          margin-top: 6px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(26,107,58,0.35);
        }
        .submit-btn:active:not(:disabled) { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .divider {
          border: none; border-top: 1.5px solid #edf6f0;
          margin: 22px 0 18px;
        }

        .signup-prompt {
          text-align: center;
          font-size: 13px; color: #9dbeaa; font-weight: 500;
        }
        .signup-prompt a {
          color: #1a6b3a; font-weight: 700; text-decoration: none;
        }
        .signup-prompt a:hover { text-decoration: underline; }
      `}</style>

      <div className="login-wrap">
        <div className="login-card">

          {/* Hero Banner */}
          <div className="login-hero">
            <div className="hero-badge">
              <Flame size={10} color="#fde047" />
              Restaurant OS
            </div>
            <div className="hero-logo">
              <UtensilsCrossed size={22} color="white" />
            </div>
            <h1 className="hero-title">Welcome back 👋</h1>
            <p className="hero-sub">Sign in to manage your restaurant</p>
          </div>

          {/* Form Body */}
          <div className="login-body">
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              <div>
                <label className="field-label">Email address</label>
                <input
                  className="field-input"
                  type="email"
                  placeholder="owner@restaurant.com"
                  {...register("email", { required: "Email is required" })}
                />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>

              <div>
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="••••••••"
                  {...register("password", { required: "Password is required" })}
                />
                {errors.password && <p className="field-error">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Signing in...</>
                  : <><span>Sign In</span><ArrowRight size={15} /></>
                }
              </button>
            </form>

            <hr className="divider" />

            <p className="signup-prompt">
              Don&apos;t have an account?{" "}
              <Link href="/restaurant/signup">Sign up free</Link>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}